/**
 * 学生时间表 PDF 生成 API
 * 
 * POST /api/time-table/student/[studentId]/pdf - 生成并上传 PDF
 * GET /api/time-table/student/[studentId]/pdf - 获取 PDF 下载链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeAvailabilities, students, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { 
  generateAndUploadPDF,
  getPDFSignedUrl,
} from '@/lib/pdf-service';
import { TimetablePDF } from '@/lib/pdf-templates/timetable-pdf';

// POST - 生成 PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    // 获取学生信息
    const studentRecords = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
        major: students.major,
        consultantId: students.consultantId,
      })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (studentRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: '学生不存在' },
        { status: 404 }
      );
    }

    const student = studentRecords[0];

    // 获取规划顾问信息
    let consultantName = '-';
    if (student.consultantId) {
      const consultants = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, student.consultantId))
        .limit(1);
      if (consultants.length > 0) {
        consultantName = consultants[0].name;
      }
    }

    // 获取时间表数据
    const availabilities = await db
      .select()
      .from(timeAvailabilities)
      .where(eq(timeAvailabilities.studentId, studentId));

    // 构建时间表对象
    const timetable: Record<string, Record<string, {
      isAvailable: boolean;
      reservationType: string;
      notes?: string;
    }>> = {};

    // 初始化所有时段
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const timeSlots = ['10:00', '13:00', '15:00', '18:00', '20:00'];

    weekDays.forEach((day) => {
      timetable[day] = {};
      timeSlots.forEach((slot) => {
        timetable[day][slot] = {
          isAvailable: false,
          reservationType: '不可用',
        };
      });
    });

    // 填充时间表数据
    let totalAvailableSlots = 0;
    let totalReservedSlots = 0;
    let totalCourseSlots = 0;
    let totalUnavailableSlots = 0;

    availabilities.forEach((item) => {
      if (timetable[item.weekDay] && timetable[item.weekDay][item.timeSlot]) {
        timetable[item.weekDay][item.timeSlot] = {
          isAvailable: item.isAvailable,
          reservationType: item.reservationType || (item.isAvailable ? '空闲' : '不可用'),
          notes: item.notes || undefined,
        };

        // 统计
        switch (item.reservationType) {
          case '空闲':
            totalAvailableSlots++;
            break;
          case '顾问指导':
            totalReservedSlots++;
            break;
          case '固定课程':
            totalCourseSlots++;
            break;
          default:
            if (item.isAvailable) {
              totalAvailableSlots++;
            } else {
              totalUnavailableSlots++;
            }
        }
      }
    });

    // 生成 PDF
    const pdfData = {
      studentName: student.name,
      studentId: student.studentId,
      major: student.major,
      consultantName,
      timetable,
      totalAvailableSlots,
      totalReservedSlots,
      totalCourseSlots,
      totalUnavailableSlots,
    };

    const { key, url } = await generateAndUploadPDF(
      'timetable',
      student.studentId,
      <TimetablePDF data={pdfData} />
    );

    return NextResponse.json({
      success: true,
      data: {
        pdfKey: key,
        pdfUrl: url,
      },
    });
  } catch (error) {
    console.error('生成PDF失败:', error);
    return NextResponse.json(
      { success: false, error: '生成PDF失败' },
      { status: 500 }
    );
  }
}

// GET - 获取 PDF 下载链接
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    // 获取学生信息
    const studentRecords = await db
      .select({
        studentId: students.studentId,
        name: students.name,
      })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (studentRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: '学生不存在' },
        { status: 404 }
      );
    }

    const student = studentRecords[0];

    // 时间表PDF存储在对象存储中，key格式为: timetables/pdf/{studentId}_{timestamp}.pdf
    // 由于时间表会更新，这里直接触发重新生成
    return NextResponse.json({
      success: false,
      error: '请使用POST方法生成PDF',
      hint: '时间表可能会更新，建议每次都重新生成',
    });
  } catch (error) {
    console.error('获取PDF失败:', error);
    return NextResponse.json(
      { success: false, error: '获取PDF失败' },
      { status: 500 }
    );
  }
}
