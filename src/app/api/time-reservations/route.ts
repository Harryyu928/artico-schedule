/**
 * 时间预留管理 API
 * 
 * GET  /api/time-reservations - 获取时间预留列表
 * POST /api/time-reservations - 创建时间预留（顾问帮学生预留指导时间）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeAvailabilities, students, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { WeekDay, TimeSlot } from '@/types';

// 时间预留类型
type ReservationType = '空闲' | '顾问指导' | '固定课程' | '不可用';

// GET - 获取时间预留列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const consultantId = searchParams.get('consultantId');
    const reservationType = searchParams.get('reservationType') as ReservationType | null;
    
    // 构建查询条件
    const conditions = [];
    
    if (studentId) {
      conditions.push(eq(timeAvailabilities.userId, studentId));
    }
    
    if (consultantId) {
      conditions.push(eq(timeAvailabilities.consultantId, consultantId));
    }
    
    if (reservationType) {
      conditions.push(eq(timeAvailabilities.reservationType, reservationType));
    }
    
    // 查询时间预留
    const reservations = await db.query.timeAvailabilities.findMany({
      where: conditions.length > 0 
        ? (conditions.length === 1 ? conditions[0] : and(...conditions))
        : undefined,
    });
    
    // 排序
    const sortedReservations = reservations.sort((a, b) => {
      const weekOrder = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7 };
      const slotOrder = { '10:00': 1, '13:00': 2, '15:00': 3, '18:00': 4, '20:00': 5 };
      const weekDiff = (weekOrder[a.weekDay as keyof typeof weekOrder] || 0) - (weekOrder[b.weekDay as keyof typeof weekOrder] || 0);
      if (weekDiff !== 0) return weekDiff;
      return (slotOrder[a.timeSlot as keyof typeof slotOrder] || 0) - (slotOrder[b.timeSlot as keyof typeof slotOrder] || 0);
    });
    
    return NextResponse.json({
      success: true,
      data: sortedReservations,
    });
  } catch (error) {
    console.error('获取时间预留失败:', error);
    return NextResponse.json(
      { success: false, error: '获取时间预留失败' },
      { status: 500 }
    );
  }
}

// POST - 创建时间预留（顾问帮学生预留指导时间）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      studentId, 
      consultantId, 
      weekDay, 
      timeSlot, 
      reservationType = '顾问指导',
      notes 
    } = body;
    
    // 验证必填字段
    if (!studentId || !weekDay || !timeSlot) {
      return NextResponse.json(
        { success: false, error: '学生ID、星期和时间槽为必填项' },
        { status: 400 }
      );
    }
    
    // 验证学生存在
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });
    
    if (!student) {
      return NextResponse.json(
        { success: false, error: '学生不存在' },
        { status: 404 }
      );
    }
    
    // 检查是否已有该时间段
    const existing = await db.query.timeAvailabilities.findFirst({
      where: and(
        eq(timeAvailabilities.userId, studentId),
        eq(timeAvailabilities.weekDay, weekDay as WeekDay),
        eq(timeAvailabilities.timeSlot, timeSlot as TimeSlot)
      ),
    });
    
    if (existing) {
      // 更新现有记录
      await db.update(timeAvailabilities)
        .set({
          reservationType: reservationType as ReservationType,
          consultantId: consultantId || null,
          notes: notes || null,
          isAvailable: reservationType === '空闲',
          updatedAt: new Date(),
        })
        .where(eq(timeAvailabilities.id, existing.id));
      
      const updated = await db.query.timeAvailabilities.findFirst({
        where: eq(timeAvailabilities.id, existing.id),
      });
      
      return NextResponse.json({
        success: true,
        data: updated,
        message: '时间预留已更新',
      });
    }
    
    // 创建新的时间预留
    const reservationId = uuidv4();
    await db.insert(timeAvailabilities).values({
      id: reservationId,
      userId: studentId,
      userRole: '学生',
      name: student.name,
      weekDay: weekDay as WeekDay,
      timeSlot: timeSlot as TimeSlot,
      isAvailable: reservationType === '空闲',
      reservationType: reservationType as ReservationType,
      consultantId: consultantId || null,
      notes: notes || null,
    });
    
    const newReservation = await db.query.timeAvailabilities.findFirst({
      where: eq(timeAvailabilities.id, reservationId),
    });
    
    return NextResponse.json({
      success: true,
      data: newReservation,
      message: '时间预留已创建',
    });
  } catch (error) {
    console.error('创建时间预留失败:', error);
    return NextResponse.json(
      { success: false, error: '创建时间预留失败' },
      { status: 500 }
    );
  }
}
