/**
 * 自动排课算法引擎
 * 
 * 核心逻辑：
 * 1. 遍历学生选课表
 * 2. 找到能教授该课程的导师
 * 3. 匹配学生和导师的可用时间
 * 4. 检查导师课时限制
 * 5. 创建排课记录
 */

import { 
  WeekDay, 
  TimeSlot, 
  CourseCategory,
  ScheduleStatus,
  AutoScheduleRequest,
  ScheduleResultResponse,
  ScheduleResultWithDetails,
} from '@/types';
import {
  getStudentCourses,
  getTeachers,
  getTimeAvailabilities,
  createScheduleResult,
  updateStudentCourse,
  updateTeacher,
  updateStudent,
} from './db-service';
import type { Student, Teacher, Course, StudentCourse, TimeAvailability } from '@/db/schema';
import { feishuCalendar, feishuMessage } from './feishu-adapter';

// 时间段映射（用于排序）
const TIME_SLOT_ORDER = {
  '10:00': 1,
  '13:00': 2,
  '15:00': 3,
  '18:00': 4,
  '20:00': 5,
};

// 星期映射（用于排序）
const WEEK_DAY_ORDER = {
  '周一': 1,
  '周二': 2,
  '周三': 3,
  '周四': 4,
  '周五': 5,
  '周六': 6,
  '周日': 7,
};

/**
 * 排课引擎类
 */
export class SchedulingEngine {
  private studentCourses: (StudentCourse & { student: Student; course: Course })[] = [];
  private teachers: Teacher[] = [];
  private timeAvailabilities: TimeAvailability[] = [];
  private existingSchedules: any[] = [];

  /**
   * 加载数据
   */
  async loadData(request?: AutoScheduleRequest) {
    // 加载学生选课数据
    const studentCoursesData = await getStudentCourses();
    
    // TODO: 关联查询学生和课程信息
    // 这里简化处理，实际需要关联查询
    
    // 加载导师数据
    this.teachers = await getTeachers();
    
    // 加载时间可用性数据
    this.timeAvailabilities = await getTimeAvailabilities({});
    
    // TODO: 加载已有排课数据（用于冲突检测）
    // this.existingSchedules = await getScheduleResults();
  }

  /**
   * 执行自动排课
   */
  async autoSchedule(request?: AutoScheduleRequest): Promise<ScheduleResultResponse> {
    await this.loadData(request);

    const results: ScheduleResultWithDetails[] = [];
    const conflicts: Array<{
      student_id: string;
      course_id: string;
      reason: string;
    }> = [];

    // 按优先规则排序
    let sortedStudentCourses = [...this.studentCourses];
    
    if (request?.priority_rule === 'remaining_hours') {
      // 按剩余课时排序（多的优先）
      sortedStudentCourses.sort((a, b) => 
        (b.totalHours - b.scheduledHours) - (a.totalHours - a.scheduledHours)
      );
    }

    // 遍历学生选课
    for (const studentCourse of sortedStudentCourses) {
      // 检查是否还有剩余课时
      const remainingHours = studentCourse.totalHours - studentCourse.scheduledHours;
      if (remainingHours <= 0) continue;

      // 获取课程信息
      const course = studentCourse.course;
      const student = studentCourse.student;

      // 找到能教授该课程的导师
      const availableTeachers = this.findAvailableTeachers(course.category as CourseCategory);

      if (availableTeachers.length === 0) {
        conflicts.push({
          student_id: student.id,
          course_id: course.id,
          reason: '没有导师可以教授该课程',
        });
        continue;
      }

      // 获取学生可用时间
      const studentAvailableTimes = this.getUserAvailableTimes(student.id, '学生');

      // 尝试匹配导师和时间
      let scheduled = false;
      
      for (const teacher of availableTeachers) {
        // 检查导师课时限制
        if (teacher.currentHours >= teacher.maxWeeklyHours) {
          continue;
        }

        // 获取导师可用时间
        const teacherAvailableTimes = this.getUserAvailableTimes(teacher.id, '导师');

        // 找到时间重合
        const matchedTime = this.findTimeMatch(
          studentAvailableTimes,
          teacherAvailableTimes,
          student.id,
          teacher.id
        );

        if (matchedTime) {
          // 创建排课记录
          try {
            const schedule = await this.createSchedule(
              student,
              teacher,
              course,
              studentCourse,
              matchedTime.weekDay,
              matchedTime.timeSlot
            );

            results.push({
              ...schedule,
              student: student as any,
              teacher: teacher as any,
              course: course as any,
              hours: schedule.hours || 2,
            });
            scheduled = true;

            // 更新课时统计
            await updateStudentCourse(studentCourse.id, {
              scheduledHours: studentCourse.scheduledHours + 2,
            });

            await updateTeacher(teacher.id, {
              currentHours: teacher.currentHours + 2,
            });

            await updateStudent(student.id, {
              usedHours: student.usedHours + 2,
            });

            // 发送通知（如果飞书已启用）
            await this.sendNotifications(student, teacher, course, matchedTime);

            break; // 成功排课，跳出导师循环
          } catch (error) {
            console.error('创建排课记录失败:', error);
          }
        }
      }

      if (!scheduled) {
        conflicts.push({
          student_id: student.id,
          course_id: course.id,
          reason: '无法找到合适的时间安排',
        });
      }
    }

    return {
      success: conflicts.length === 0,
      scheduled_count: results.length,
      failed_count: conflicts.length,
      results,
      conflicts,
    };
  }

  /**
   * 找到能教授该课程的导师
   */
  private findAvailableTeachers(courseCategory: CourseCategory): Teacher[] {
    return this.teachers.filter(teacher => 
      teacher.teachableCourses.includes(courseCategory) &&
      teacher.currentHours < teacher.maxWeeklyHours
    );
  }

  /**
   * 获取用户可用时间
   */
  private getUserAvailableTimes(userId: string, userRole: string): Array<{
    weekDay: WeekDay;
    timeSlot: TimeSlot;
  }> {
    return this.timeAvailabilities
      .filter(t => 
        t.userId === userId && 
        t.userRole === userRole && 
        t.isAvailable
      )
      .map(t => ({
        weekDay: t.weekDay as WeekDay,
        timeSlot: t.timeSlot as TimeSlot,
      }))
      .sort((a, b) => {
        // 先按星期排序，再按时间段排序
        const weekDiff = WEEK_DAY_ORDER[a.weekDay] - WEEK_DAY_ORDER[b.weekDay];
        if (weekDiff !== 0) return weekDiff;
        return TIME_SLOT_ORDER[a.timeSlot] - TIME_SLOT_ORDER[b.timeSlot];
      });
  }

  /**
   * 找到时间匹配
   */
  private findTimeMatch(
    studentTimes: Array<{ weekDay: WeekDay; timeSlot: TimeSlot }>,
    teacherTimes: Array<{ weekDay: WeekDay; timeSlot: TimeSlot }>,
    studentId: string,
    teacherId: string
  ): { weekDay: WeekDay; timeSlot: TimeSlot } | null {
    // 找到学生和导师时间的交集
    for (const studentTime of studentTimes) {
      for (const teacherTime of teacherTimes) {
        if (
          studentTime.weekDay === teacherTime.weekDay &&
          studentTime.timeSlot === teacherTime.timeSlot
        ) {
          // 检查是否与已有排课冲突
          if (!this.hasConflict(studentId, teacherId, studentTime.weekDay, studentTime.timeSlot)) {
            return studentTime;
          }
        }
      }
    }
    return null;
  }

  /**
   * 检查时间冲突
   */
  private hasConflict(
    studentId: string,
    teacherId: string,
    weekDay: WeekDay,
    timeSlot: TimeSlot
  ): boolean {
    // 检查学生是否在该时间已有课程
    const studentConflict = this.existingSchedules.some(
      s => s.studentId === studentId && s.weekDay === weekDay && s.timeSlot === timeSlot
    );
    
    if (studentConflict) return true;

    // 检查导师是否在该时间已有课程
    const teacherConflict = this.existingSchedules.some(
      s => s.teacherId === teacherId && s.weekDay === weekDay && s.timeSlot === timeSlot
    );

    return teacherConflict;
  }

  /**
   * 创建排课记录
   */
  private async createSchedule(
    student: Student,
    teacher: Teacher,
    course: Course,
    studentCourse: StudentCourse,
    weekDay: WeekDay,
    timeSlot: TimeSlot
  ) {
    // 计算日期（从下周开始）
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    // 调整到对应的星期几
    const dayOfWeek = WEEK_DAY_ORDER[weekDay];
    const currentDayOfWeek = nextWeek.getDay();
    const diff = (dayOfWeek - currentDayOfWeek + 7) % 7;
    nextWeek.setDate(nextWeek.getDate() + diff);

    const schedule = await createScheduleResult({
      studentId: student.id,
      teacherId: teacher.id,
      courseId: course.id,
      studentCourseId: studentCourse.id,
      date: nextWeek.toISOString().split('T')[0] as any, // 转换为日期字符串 YYYY-MM-DD
      weekDay: weekDay as any,
      timeSlot: timeSlot as any,
      hours: 2,
      status: ScheduleStatus.PENDING as any,
    } as any);

    // 添加到已有排课列表（防止后续冲突）
    this.existingSchedules.push(schedule);

    return {
      ...schedule,
      student,
      teacher,
      course,
    };
  }

  /**
   * 发送通知
   */
  private async sendNotifications(
    student: Student,
    teacher: Teacher,
    course: Course,
    time: { weekDay: WeekDay; timeSlot: TimeSlot }
  ) {
    try {
      const timeStr = `${time.weekDay} ${time.timeSlot}`;

      // 通知学生
      await feishuMessage.sendScheduleNotificationToStudent(
        student.name,
        course.name,
        teacher.name,
        timeStr
      );

      // 通知导师
      await feishuMessage.sendScheduleNotificationToTeacher(
        teacher.name,
        student.name,
        course.name,
        timeStr
      );

      // 创建日历事件
      const startTime = new Date();
      // TODO: 计算具体的开始时间
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2小时后

      await feishuCalendar.createEvent({
        summary: `ARTDiCO课程 - ${course.name}`,
        description: `学生：${student.name}\n导师：${teacher.name}\n课程：${course.name}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        attendees: [
          { open_id: student.id },
          { open_id: teacher.id },
        ],
        reminders: [{ minutes: 30 }],
      });
    } catch (error) {
      console.error('发送通知失败:', error);
      // 不影响排课流程
    }
  }
}

// 导出单例
export const schedulingEngine = new SchedulingEngine();
