/**
 * 排课前校验 API
 * 
 * POST /api/schedule/validate
 * 在执行自动排课前，检查学生和导师的时间表是否完整
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeAvailabilities, students, teachers, courseSelectionForms, courseSelectionItems, courses, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// 时间表状态类型
type TimeTableStatus = '未填写' | '部分填写' | '已填写' | '已确认';

// 校验结果
interface ValidationResult {
  valid: boolean;
  issues: Array<{
    type: 'student_time_missing' | 'student_time_incomplete' | 'teacher_time_missing' | 'teacher_time_incomplete' | 'no_available_match';
    message: string;
    studentId?: string;
    studentName?: string;
    teacherId?: string;
    teacherName?: string;
  }>;
  warnings: Array<{
    type: 'limited_time_options' | 'teacher_near_limit';
    message: string;
  }>;
  summary: {
    totalStudents: number;
    studentsWithTimeTable: number;
    totalTeachers: number;
    teachersWithTimeTable: number;
    readyToSchedule: boolean;
  };
}

// 检查用户时间表状态
async function checkTimeTableStatus(userId: string, userRole: string): Promise<{
  status: TimeTableStatus;
  availableSlots: number;
}> {
  const slots = await db.query.timeAvailabilities.findMany({
    where: and(
      eq(timeAvailabilities.userId, userId),
      eq(timeAvailabilities.userRole, userRole as any),
      eq(timeAvailabilities.reservationType, '空闲')
    ),
  });
  
  const availableSlots = slots.filter(s => s.isAvailable).length;
  
  let status: TimeTableStatus;
  if (availableSlots === 0) {
    status = '未填写';
  } else if (availableSlots < 5) {
    status = '部分填写';
  } else {
    // 检查是否已确认
    const confirmedSlot = slots.find(s => s.notes?.includes('confirmed:'));
    status = confirmedSlot ? '已确认' : '已填写';
  }
  
  return { status, availableSlots };
}

// POST - 排课前校验
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectionFormId, studentIds, teacherIds } = body as {
      selectionFormId?: string;
      studentIds?: string[];
      teacherIds?: string[];
    };
    
    const issues: ValidationResult['issues'] = [];
    const warnings: ValidationResult['warnings'] = [];
    
    let targetStudentIds = studentIds || [];
    let targetTeacherIds = teacherIds || [];
    
    // 如果提供了选课单ID，获取其中的学生和导师
    if (selectionFormId) {
      const form = await db.query.courseSelectionForms.findFirst({
        where: eq(courseSelectionForms.id, selectionFormId),
      });
      
      if (form) {
        targetStudentIds = [form.studentId];
        
        // 获取选课单中的课程，找到能教授这些课程的导师
        const items = await db.query.courseSelectionItems.findMany({
          where: eq(courseSelectionItems.formId, selectionFormId),
        });
        
        // 查询能教授这些课程的导师
        if (items.length > 0) {
          const courseIds = items.map(item => item.courseId);
          const coursesData = await db.query.courses.findMany({
            where: inArray(courses.id, courseIds),
          });
          
          const categories = coursesData.map(c => c.category);
          const allTeachers = await db.query.teachers.findMany();
          
          targetTeacherIds = allTeachers
            .filter(t => t.teachableCourses.some(c => categories.includes(c)))
            .map(t => t.id);
        }
      }
    }
    
    // 如果没有指定，检查所有学生和导师
    if (targetStudentIds.length === 0) {
      const allStudents = await db.query.students.findMany();
      targetStudentIds = allStudents.map(s => s.id);
    }
    
    if (targetTeacherIds.length === 0) {
      const allTeachers = await db.query.teachers.findMany();
      targetTeacherIds = allTeachers.map(t => t.id);
    }
    
    // 检查学生时间表
    let studentsWithTimeTable = 0;
    for (const studentId of targetStudentIds) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });
      
      if (!student) continue;
      
      const { status, availableSlots } = await checkTimeTableStatus(studentId, '学生');
      
      if (status === '未填写') {
        issues.push({
          type: 'student_time_missing',
          message: `学生 ${student.name} 尚未填写时间表`,
          studentId,
          studentName: student.name,
        });
      } else if (status === '部分填写') {
        issues.push({
          type: 'student_time_incomplete',
          message: `学生 ${student.name} 的时间表不完整（仅 ${availableSlots} 个时间段）`,
          studentId,
          studentName: student.name,
        });
      } else {
        studentsWithTimeTable++;
      }
      
      if (availableSlots > 0 && availableSlots < 5) {
        warnings.push({
          type: 'limited_time_options',
          message: `学生 ${student.name} 可选时间较少（${availableSlots} 个时间段），可能影响匹配成功率`,
        });
      }
    }
    
    // 检查导师时间表
    let teachersWithTimeTable = 0;
    for (const teacherId of targetTeacherIds) {
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, teacherId),
      });
      
      if (!teacher) continue;
      
      const userRole = teacher.teacherType === '全职' ? '全职导师' : '兼职导师';
      const { status, availableSlots } = await checkTimeTableStatus(teacherId, userRole);
      
      if (status === '未填写') {
        issues.push({
          type: 'teacher_time_missing',
          message: `导师 ${teacher.name} 尚未填写时间表`,
          teacherId,
          teacherName: teacher.name,
        });
      } else if (status === '部分填写') {
        issues.push({
          type: 'teacher_time_incomplete',
          message: `导师 ${teacher.name} 的时间表不完整（仅 ${availableSlots} 个时间段）`,
          teacherId,
          teacherName: teacher.name,
        });
      } else {
        teachersWithTimeTable++;
      }
      
      // 检查导师课时是否接近上限
      if (teacher.currentHours >= teacher.maxWeeklyHours * 0.9) {
        warnings.push({
          type: 'teacher_near_limit',
          message: `导师 ${teacher.name} 本周课时已接近上限（${teacher.currentHours}/${teacher.maxWeeklyHours}）`,
        });
      }
    }
    
    const result: ValidationResult = {
      valid: issues.filter(i => 
        i.type === 'student_time_missing' || 
        i.type === 'teacher_time_missing'
      ).length === 0,
      issues,
      warnings,
      summary: {
        totalStudents: targetStudentIds.length,
        studentsWithTimeTable,
        totalTeachers: targetTeacherIds.length,
        teachersWithTimeTable,
        readyToSchedule: issues.length === 0,
      },
    };
    
    return NextResponse.json({ success: true, data: result });
    
  } catch (error) {
    console.error('排课前校验失败:', error);
    return NextResponse.json(
      { success: false, error: '校验失败' },
      { status: 500 }
    );
  }
}
