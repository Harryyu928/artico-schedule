/**
 * 选课单和上课记录服务层
 */

import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  students,
  applicationSchools,
  courseSelectionForms,
  courseSelectionItems,
  classRecords,
} from '@/db/schema';
import type {
  NewApplicationSchool,
  NewCourseSelectionForm,
  NewCourseSelectionItem,
  NewClassRecord,
} from '@/db/schema';
import type {
  CreateApplicationSchoolRequest,
  CreateSelectionFormRequest,
  AddSelectionItemRequest,
  CreateClassRecordRequest,
  UpdateSelectionProgressRequest,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

// ==================== 申请院校相关操作 ====================

export async function createApplicationSchool(data: CreateApplicationSchoolRequest) {
  const id = uuidv4();
  
  const [school] = await db.insert(applicationSchools).values({
    id,
    studentId: data.student_id,
    schoolName: data.school_name,
    country: data.country as any,
    major: data.major,
    degree: data.degree as any,
    priority: data.priority || 1,
    deadline: data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : null,
  } as any).returning();

  return school;
}

export async function getApplicationSchools(studentId: string) {
  return db.select().from(applicationSchools)
    .where(eq(applicationSchools.studentId, studentId))
    .orderBy(applicationSchools.priority);
}

export async function updateApplicationSchool(id: string, data: Partial<NewApplicationSchool>) {
  const [school] = await db
    .update(applicationSchools)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(applicationSchools.id, id))
    .returning();
  return school;
}

export async function deleteApplicationSchool(id: string) {
  await db.delete(applicationSchools).where(eq(applicationSchools.id, id));
}

// ==================== 选课单相关操作 ====================

export async function createSelectionForm(data: CreateSelectionFormRequest) {
  const id = uuidv4();
  const formId = `SEL${Date.now()}`;
  
  const [form] = await db.insert(courseSelectionForms).values({
    id,
    formId,
    studentId: data.student_id,
    consultationTeacherId: data.consultation_teacher_id,
    estimatedStartDate: new Date(data.estimated_start_date).toISOString().split('T')[0] as any,
    estimatedEndDate: new Date(data.estimated_end_date).toISOString().split('T')[0] as any,
    notes: data.notes,
    goals: data.goals,
  } as any).returning();

  return form;
}

export async function getSelectionForms(options?: {
  studentId?: string;
  status?: string;
}) {
  const conditions = [];
  
  if (options?.studentId) {
    conditions.push(eq(courseSelectionForms.studentId, options.studentId));
  }
  
  if (options?.status) {
    conditions.push(eq(courseSelectionForms.status, options.status as any));
  }

  if (conditions.length > 0) {
    return db.select().from(courseSelectionForms).where(and(...conditions));
  }

  return db.select().from(courseSelectionForms);
}

export async function getSelectionFormById(id: string) {
  const [form] = await db.select().from(courseSelectionForms).where(eq(courseSelectionForms.id, id));
  return form;
}

export async function updateSelectionForm(id: string, data: Partial<NewCourseSelectionForm>) {
  const [form] = await db
    .update(courseSelectionForms)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(courseSelectionForms.id, id))
    .returning();
  return form;
}

export async function deleteSelectionForm(id: string) {
  // 先删除关联的明细
  await db.delete(courseSelectionItems).where(eq(courseSelectionItems.formId, id));
  // 再删除选课单
  await db.delete(courseSelectionForms).where(eq(courseSelectionForms.id, id));
}

// ==================== 选课单明细相关操作 ====================

export async function addSelectionItem(data: AddSelectionItemRequest) {
  const id = uuidv4();
  
  const [item] = await db.insert(courseSelectionItems).values({
    id,
    formId: data.form_id,
    courseId: data.course_id,
    courseType: data.course_type as any,
    courseStage: data.course_stage as any,
    plannedHours: data.planned_hours,
    priority: data.priority || 5,
    plannedStartDate: data.planned_start_date ? new Date(data.planned_start_date).toISOString().split('T')[0] as any : null,
    plannedEndDate: data.planned_end_date ? new Date(data.planned_end_date).toISOString().split('T')[0] as any : null,
    notes: data.notes,
  } as any).returning();

  // 更新选课单的统计信息
  await updateFormStatistics(data.form_id);

  return item;
}

export async function getSelectionItems(formId: string) {
  return db.select().from(courseSelectionItems)
    .where(eq(courseSelectionItems.formId, formId))
    .orderBy(courseSelectionItems.priority);
}

export async function updateSelectionItem(id: string, data: Partial<NewCourseSelectionItem>) {
  const [item] = await db
    .update(courseSelectionItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(courseSelectionItems.id, id))
    .returning();
  
  // 更新选课单的统计信息
  if (item) {
    await updateFormStatistics(item.formId);
  }
  
  return item;
}

export async function updateSelectionProgress(data: UpdateSelectionProgressRequest) {
  const [item] = await db
    .update(courseSelectionItems)
    .set({
      completedHours: data.completed_hours,
      status: data.status as any,
      currentPhase: data.current_phase as any,
      notes: data.notes,
      updatedAt: new Date(),
    })
    .where(eq(courseSelectionItems.id, data.item_id))
    .returning();
  
  // 更新选课单的统计信息
  if (item) {
    await updateFormStatistics(item.formId);
  }
  
  return item;
}

export async function deleteSelectionItem(id: string) {
  const [item] = await db.select().from(courseSelectionItems).where(eq(courseSelectionItems.id, id));
  
  if (item) {
    await db.delete(courseSelectionItems).where(eq(courseSelectionItems.id, id));
    // 更新选课单的统计信息
    await updateFormStatistics(item.formId);
  }
}

// 更新选课单统计信息
async function updateFormStatistics(formId: string) {
  const items = await db.select().from(courseSelectionItems)
    .where(eq(courseSelectionItems.formId, formId));

  const totalCourses = items.length;
  const completedCourses = items.filter(i => i.status === '已完成').length;
  const totalHours = items.reduce((sum, i) => sum + i.plannedHours, 0);
  const completedHours = items.reduce((sum, i) => sum + i.completedHours, 0);

  await db
    .update(courseSelectionForms)
    .set({
      totalCourses,
      completedCourses,
      totalHours,
      completedHours,
      totalPlannedHours: totalHours,
      updatedAt: new Date(),
    })
    .where(eq(courseSelectionForms.id, formId));
}

// ==================== 上课记录相关操作 ====================

export async function createClassRecord(data: CreateClassRecordRequest) {
  const id = uuidv4();
  const recordId = `REC${Date.now()}`;
  
  // 从日期计算星期几
  const classDate = new Date(data.class_date);
  const weekDay = data.week_day || getWeekDay(classDate);
  
  const [record] = await db.insert(classRecords).values({
    id,
    recordId,
    scheduleId: data.schedule_id,
    studentId: data.student_id,
    teacherId: data.teacher_id,
    courseId: data.course_id,
    selectionItemId: data.selection_item_id,
    classDate: classDate.toISOString().split('T')[0] as any,
    weekDay: weekDay as any,
    startTime: data.start_time as any,
    actualDuration: data.actual_duration,
    contentSummary: data.content_summary,
    attendanceStatus: data.attendance_status as any,
    studentPerformance: data.student_performance,
    homeworkAssigned: data.homework_assigned,
    homeworkDeadline: data.homework_deadline ? new Date(data.homework_deadline).toISOString().split('T')[0] as any : null,
    nextClassPlan: data.next_class_plan,
    teacherFeedback: data.teacher_feedback,
    projectPhase: data.project_phase as any,
    phaseContent: data.phase_content,
    attachments: data.attachments as any,
    createdBy: data.teacher_id,
  } as any).returning();

  // 如果关联了选课单明细，更新其进度
  if (data.selection_item_id) {
    await updateItemProgressFromRecords(data.selection_item_id);
  }

  return record;
}

// 辅助函数：从日期计算星期几
function getWeekDay(date: Date): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[date.getDay()];
}

export async function getClassRecords(options?: {
  studentId?: string;
  teacherId?: string;
  courseId?: string;
  selectionItemId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const conditions = [];
  
  if (options?.studentId) {
    conditions.push(eq(classRecords.studentId, options.studentId));
  }
  
  if (options?.teacherId) {
    conditions.push(eq(classRecords.teacherId, options.teacherId));
  }
  
  if (options?.courseId) {
    conditions.push(eq(classRecords.courseId, options.courseId));
  }
  
  if (options?.selectionItemId) {
    conditions.push(eq(classRecords.selectionItemId, options.selectionItemId));
  }

  // TODO: 添加日期范围过滤和分页

  if (conditions.length > 0) {
    return db.select().from(classRecords)
      .where(and(...conditions))
      .orderBy(classRecords.classDate);
  }

  return db.select().from(classRecords).orderBy(classRecords.classDate);
}

export async function getClassRecordById(id: string) {
  const [record] = await db.select().from(classRecords).where(eq(classRecords.id, id));
  return record;
}

export async function updateClassRecord(id: string, data: Partial<NewClassRecord>) {
  const [record] = await db
    .update(classRecords)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(classRecords.id, id))
    .returning();
  
  // 如果更新了上课时长或关联的选课单明细，更新进度
  if (record && record.selectionItemId) {
    await updateItemProgressFromRecords(record.selectionItemId);
  }
  
  return record;
}

export async function deleteClassRecord(id: string) {
  const [record] = await db.select().from(classRecords).where(eq(classRecords.id, id));
  
  if (record) {
    await db.delete(classRecords).where(eq(classRecords.id, id));
    
    // 更新关联的选课单明细进度
    if (record.selectionItemId) {
      await updateItemProgressFromRecords(record.selectionItemId);
    }
  }
}

// 根据上课记录更新选课单明细进度
async function updateItemProgressFromRecords(itemId: string) {
  const records = await db.select().from(classRecords)
    .where(eq(classRecords.selectionItemId, itemId));

  const completedHours = records
    .filter(r => r.attendanceStatus === '已完成')
    .reduce((sum, r) => sum + r.actualDuration / 60, 0); // 转换为小时

  const scheduledHours = records.length * 2; // 假设每节课2小时

  // 更新明细状态
  const [item] = await db.select().from(courseSelectionItems)
    .where(eq(courseSelectionItems.id, itemId));

  if (item) {
    let status = item.status;
    
    if (completedHours >= item.plannedHours) {
      status = '已完成' as any;
    } else if (completedHours > 0) {
      status = '上课中' as any;
    } else if (scheduledHours > 0) {
      status = '排课中' as any;
    }

    await db
      .update(courseSelectionItems)
      .set({
        completedHours: Math.round(completedHours * 10) / 10, // 保留一位小数
        scheduledHours,
        status,
        updatedAt: new Date(),
      })
      .where(eq(courseSelectionItems.id, itemId));

    // 更新选课单统计
    await updateFormStatistics(item.formId);
  }
}

// ==================== 统计相关操作 ====================

export async function getCourseProgressStats() {
  const [studentCount] = await db.select({ count: sql<number>`count(*)` }).from(students);
  const [formCount] = await db.select({ count: sql<number>`count(*)` }).from(courseSelectionForms);
  const [recordCount] = await db.select({ count: sql<number>`count(*)` }).from(classRecords);

  // 统计执行中的选课单
  const [inProgressCount] = await db.select({ count: sql<number>`count(*)` })
    .from(courseSelectionForms)
    .where(eq(courseSelectionForms.status, '执行中' as any));

  return {
    total_students: studentCount.count,
    active_students: 0, // TODO: 实现实际逻辑
    total_forms: formCount.count,
    in_progress_forms: inProgressCount.count,
    total_classes_this_week: 0, // TODO: 实现实际逻辑
    total_hours_this_week: 0, // TODO: 实现实际逻辑
    average_completion_rate: 0, // TODO: 实现实际逻辑
  };
}
