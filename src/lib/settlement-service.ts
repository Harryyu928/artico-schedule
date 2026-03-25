/**
 * 结课审核服务层
 * 处理结课申请、审核、课酬计算等核心业务逻辑
 */

import { db } from '@/db';
import { 
  courseSettlements, 
  batchSettlements, 
  teacherSalarySummary,
  teachers,
  classRecords,
} from '@/db/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// ==================== 类型定义 ====================

export interface CreateSettlementRequest {
  classRecordId: string;
  teachingContent?: string;
  studentPerformance?: string;
  homeworkAssigned?: string;
  nextPlan?: string;
  templateData?: Record<string, unknown>;
}

export interface ReviewSettlementRequest {
  settlementId: string;
  action: 'approve' | 'reject';
  reviewerId: string;
  reviewNotes?: string;
  adjustAmount?: number; // 金额调整（正数为加，负数为减）
  adjustReason?: string;
}

export interface BatchSubmitRequest {
  classRecordIds: string[];
  teacherId: string;
  notes?: string;
}

export interface BatchReviewRequest {
  settlementIds: string[];
  action: 'approve' | 'reject';
  reviewerId: string;
  reviewNotes?: string;
}

// ==================== 辅助函数 ====================

/**
 * 获取导师课时费率（分/小时）
 * TODO: 根据实际业务规则调整
 */
export async function getTeacherHourlyRate(teacherId: string): Promise<number> {
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, teacherId),
  });
  
  if (!teacher) return 15000; // 默认 150 元/小时（以分为单位）
  
  // 根据导师类型返回不同费率
  // TODO: 根据实际业务规则调整
  if (teacher.teacherType === '全职') {
    return 15000; // 150 元/小时
  } else {
    return 12000; // 120 元/小时
  }
}

/**
 * 从日期获取期间字符串（格式：2024-01）
 */
function getPeriodFromDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return uuidv4();
}

// ==================== 核心业务逻辑 ====================

/**
 * 创建结课申请
 * 从上课记录创建结课申请
 */
export async function createSettlement(request: CreateSettlementRequest) {
  const { classRecordId, teachingContent, studentPerformance, homeworkAssigned, nextPlan, templateData } = request;

  // 获取上课记录
  const classRecord = await db.query.classRecords.findFirst({
    where: eq(classRecords.id, classRecordId),
  });

  if (!classRecord) {
    throw new Error('上课记录不存在');
  }

  if (classRecord.attendanceStatus !== '已完成') {
    throw new Error('只有已完成的课程可以创建结课申请');
  }

  // 检查是否已存在结课记录
  const existing = await db.query.courseSettlements.findFirst({
    where: eq(courseSettlements.classRecordId, classRecordId),
  });

  if (existing) {
    throw new Error('该上课记录已创建结课申请');
  }

  // 获取导师信息（用于获取课时费标准）
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, classRecord.teacherId),
  });

  // 计算课酬
  const teachingHours = classRecord.actualDuration ? Math.ceil(classRecord.actualDuration / 60) : 2;
  const hourlyRate = teacher ? await getTeacherHourlyRate(teacher.id) : 15000;
  const baseAmount = teachingHours * hourlyRate; // 以分为单位

  // 创建结课记录
  const settlementId = `SET-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  const [settlement] = await db.insert(courseSettlements).values({
    id: generateId(),
    settlementId,
    teacherId: classRecord.teacherId,
    studentId: classRecord.studentId,
    courseId: classRecord.courseId,
    classRecordId: classRecord.id,
    selectionItemId: classRecord.selectionItemId,
    settlementType: 'single',
    classDate: classRecord.classDate,
    weekDay: classRecord.weekDay,
    timeSlot: classRecord.startTime,
    teachingHours,
    baseAmount,
    bonusAmount: 0,
    deductionAmount: 0,
    finalAmount: baseAmount,
    teachingContent: teachingContent || classRecord.contentSummary,
    studentPerformance: studentPerformance,
    homeworkAssigned: homeworkAssigned,
    nextPlan: nextPlan,
    status: 'pending',
    templateData: templateData,
  }).returning();

  return settlement;
}

/**
 * 提交结课申请
 */
export async function submitSettlement(
  settlementId: string,
  submittedBy: string
) {
  const settlement = await db.query.courseSettlements.findFirst({
    where: eq(courseSettlements.id, settlementId),
  });

  if (!settlement) {
    throw new Error('结课记录不存在');
  }

  if (settlement.status !== 'pending') {
    throw new Error('只有待提交状态的结课记录可以提交');
  }

  const [updated] = await db.update(courseSettlements)
    .set({
      status: 'submitted',
      submittedAt: new Date(),
      submittedBy,
      updatedAt: new Date(),
    })
    .where(eq(courseSettlements.id, settlementId))
    .returning();

  return updated;
}

/**
 * 审核结课申请
 */
export async function reviewSettlement(request: ReviewSettlementRequest) {
  const { settlementId, action, reviewerId, reviewNotes, adjustAmount, adjustReason } = request;

  const settlement = await db.query.courseSettlements.findFirst({
    where: eq(courseSettlements.id, settlementId),
  });

  if (!settlement) {
    throw new Error('结课记录不存在');
  }

  if (settlement.status !== 'submitted') {
    throw new Error('只有待审核状态的结课记录可以审核');
  }

  // 计算最终金额
  let finalAmount = settlement.finalAmount;
  if (adjustAmount) {
    finalAmount += adjustAmount;
  }

  const reviewNoteText = (reviewNotes || '') + (adjustReason ? `\n金额调整原因: ${adjustReason}` : '');

  const [updated] = await db.update(courseSettlements)
    .set({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      reviewNote: reviewNoteText,
      finalAmount,
      updatedAt: new Date(),
    })
    .where(eq(courseSettlements.id, settlementId))
    .returning();

  // 如果审核通过，更新课酬汇总
  if (action === 'approve') {
    await updateTeacherSalarySummary(settlement.teacherId, getPeriodFromDate(settlement.classDate));
  }

  return updated;
}

/**
 * 批量提交结课申请
 */
export async function batchSubmitSettlements(request: BatchSubmitRequest) {
  const { classRecordIds, teacherId, notes } = request;

  // 创建批量结课批次
  const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  const [batch] = await db.insert(batchSettlements).values({
    id: generateId(),
    batchId,
    teacherId,
    submittedBy: teacherId, // 假设导师自己提交
    totalRecords: classRecordIds.length,
    totalHours: 0,
    totalAmount: 0,
  }).returning();

  const results = [];
  let totalHours = 0;
  let totalAmount = 0;

  for (const classRecordId of classRecordIds) {
    try {
      const settlement = await createSettlement({
        classRecordId,
        teachingContent: notes,
      });

      // 更新 batchId
      await db.update(courseSettlements)
        .set({ batchId: batch.id })
        .where(eq(courseSettlements.id, settlement.id));

      // 自动提交
      await submitSettlement(settlement.id, teacherId);

      totalHours += settlement.teachingHours;
      totalAmount += settlement.finalAmount;

      results.push({
        classRecordId,
        success: true,
        settlementId: settlement.id,
      });
    } catch (error) {
      results.push({
        classRecordId,
        success: false,
        error: (error as Error).message,
      });
    }
  }

  // 更新批次统计
  await db.update(batchSettlements)
    .set({
      totalHours,
      totalAmount,
    })
    .where(eq(batchSettlements.id, batch.id));

  return {
    batchId: batch.batchId,
    total: classRecordIds.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

/**
 * 批量审核结课申请
 */
export async function batchReviewSettlements(request: BatchReviewRequest) {
  const { settlementIds, action, reviewerId, reviewNotes } = request;

  const results = [];

  for (const settlementId of settlementIds) {
    try {
      await reviewSettlement({
        settlementId,
        action,
        reviewerId,
        reviewNotes,
      });
      results.push({ settlementId, success: true });
    } catch (error) {
      results.push({
        settlementId,
        success: false,
        error: (error as Error).message,
      });
    }
  }

  return {
    total: settlementIds.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

/**
 * 更新导师课酬汇总
 */
export async function updateTeacherSalarySummary(teacherId: string, period: string) {
  // 获取该导师当月已审核通过的结课记录
  const approvedSettlements = await db.select()
    .from(courseSettlements)
    .where(and(
      eq(courseSettlements.teacherId, teacherId),
      eq(courseSettlements.status, 'approved'),
      sql`to_char(${courseSettlements.classDate}, 'YYYY-MM') = ${period}`
    ));

  const totalClasses = approvedSettlements.length;
  const totalHours = approvedSettlements.reduce((sum, s) => sum + (s.teachingHours || 0), 0);
  const baseSalary = approvedSettlements.reduce((sum, s) => sum + (s.baseAmount || 0), 0);
  const bonusAmount = approvedSettlements.reduce((sum, s) => sum + (s.bonusAmount || 0), 0);
  const deductionAmount = approvedSettlements.reduce((sum, s) => sum + (s.deductionAmount || 0), 0);
  const finalSalary = baseSalary + bonusAmount - deductionAmount;

  // 检查是否已存在汇总记录
  const existing = await db.query.teacherSalarySummary.findFirst({
    where: and(
      eq(teacherSalarySummary.teacherId, teacherId),
      eq(teacherSalarySummary.period, period)
    ),
  });

  if (existing) {
    // 更新
    await db.update(teacherSalarySummary)
      .set({
        totalClasses,
        totalHours,
        baseSalary,
        bonusAmount,
        deductionAmount,
        finalSalary,
        updatedAt: new Date(),
      })
      .where(eq(teacherSalarySummary.id, existing.id));
  } else {
    // 创建
    await db.insert(teacherSalarySummary).values({
      id: generateId(),
      teacherId,
      period,
      totalClasses,
      totalHours,
      baseSalary,
      bonusAmount,
      deductionAmount,
      finalSalary,
    });
  }
}

/**
 * 获取导师课酬汇总
 */
export async function getTeacherSalarySummary(teacherId: string, period?: string) {
  if (period) {
    const summary = await db.query.teacherSalarySummary.findFirst({
      where: and(
        eq(teacherSalarySummary.teacherId, teacherId),
        eq(teacherSalarySummary.period, period)
      ),
    });
    return summary;
  }

  // 返回所有期间的汇总
  const summaries = await db.query.teacherSalarySummary.findMany({
    where: eq(teacherSalarySummary.teacherId, teacherId),
    orderBy: (tss, { desc }) => [desc(tss.period)],
  });

  return summaries;
}

/**
 * 获取导师待结课的上课记录
 */
export async function getTeacherPendingSettlements(teacherId: string) {
  // 获取导师已完成但未结课的上课记录
  const completedRecords = await db.select()
    .from(classRecords)
    .where(and(
      eq(classRecords.teacherId, teacherId),
      eq(classRecords.attendanceStatus, '已完成')
    ));

  // 过滤掉已创建结课申请的
  const existingSettlements = await db.select()
    .from(courseSettlements)
    .where(eq(courseSettlements.teacherId, teacherId));

  const existingClassRecordIds = new Set(existingSettlements.map(s => s.classRecordId));

  return completedRecords.filter(r => !existingClassRecordIds.has(r.id));
}

/**
 * 获取结课列表
 */
export async function getSettlements(filters: {
  teacherId?: string;
  studentId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const { teacherId, studentId, status, startDate, endDate, page = 1, pageSize = 20 } = filters;

  const conditions = [];
  
  if (teacherId) {
    conditions.push(eq(courseSettlements.teacherId, teacherId));
  }
  if (studentId) {
    conditions.push(eq(courseSettlements.studentId, studentId));
  }
  if (status) {
    conditions.push(eq(courseSettlements.status, status as any));
  }
  if (startDate) {
    conditions.push(gte(courseSettlements.classDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(courseSettlements.classDate, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db.select()
    .from(courseSettlements)
    .where(whereClause)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // 获取总数
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(courseSettlements)
    .where(whereClause);

  return {
    data: result,
    total: Number(countResult[0]?.count) || 0,
    page,
    pageSize,
  };
}

/**
 * 获取结课详情
 */
export async function getSettlementById(settlementId: string) {
  const settlement = await db.query.courseSettlements.findFirst({
    where: eq(courseSettlements.id, settlementId),
  });

  return settlement;
}

/**
 * 更新结课申请
 */
export async function updateSettlement(settlementId: string, data: {
  teachingContent?: string;
  studentPerformance?: string;
  homeworkAssigned?: string;
  nextPlan?: string;
  bonusAmount?: number;
  deductionAmount?: number;
  templateData?: Record<string, unknown>;
}) {
  // 重新计算最终金额
  const settlement = await db.query.courseSettlements.findFirst({
    where: eq(courseSettlements.id, settlementId),
  });

  if (!settlement) {
    throw new Error('结课记录不存在');
  }

  const bonusAmount = data.bonusAmount ?? settlement.bonusAmount;
  const deductionAmount = data.deductionAmount ?? settlement.deductionAmount;
  const finalAmount = settlement.baseAmount + bonusAmount - deductionAmount;

  const [updated] = await db.update(courseSettlements)
    .set({
      ...data,
      finalAmount,
      updatedAt: new Date(),
    })
    .where(eq(courseSettlements.id, settlementId))
    .returning();

  return updated;
}

/**
 * 取消结课申请
 */
export async function cancelSettlement(settlementId: string) {
  const settlement = await db.query.courseSettlements.findFirst({
    where: eq(courseSettlements.id, settlementId),
  });

  if (!settlement) {
    throw new Error('结课记录不存在');
  }

  if (settlement.status === 'approved') {
    throw new Error('已审核通过的结课记录不能取消');
  }

  const [updated] = await db.update(courseSettlements)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(courseSettlements.id, settlementId))
    .returning();

  return updated;
}
