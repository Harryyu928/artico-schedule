/**
 * 顾问时间预留 API
 * 
 * 规划顾问可以预留时间用于：
 * - 帮签约学生填写时间表
 * - 帮签约学生预约上课
 * - 选课指导
 * 
 * GET  /api/consultant/reservations - 获取顾问的时间预留列表
 * POST /api/consultant/reservations - 创建顾问时间预留
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeAvailabilities, students, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { WeekDay, TimeSlot } from '@/types';

// 预留目的类型
type ReservationPurpose = '填写时间表' | '预约上课' | '选课指导' | '其他';

// GET - 获取顾问的时间预留列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const consultantId = searchParams.get('consultantId');
    const studentId = searchParams.get('studentId');
    const purpose = searchParams.get('purpose') as ReservationPurpose | null;
    
    if (!consultantId) {
      return NextResponse.json(
        { success: false, error: '顾问ID为必填项' },
        { status: 400 }
      );
    }
    
    // 构建查询条件
    const conditions = [eq(timeAvailabilities.consultantId, consultantId)];
    
    if (studentId) {
      conditions.push(eq(timeAvailabilities.studentId, studentId));
    }
    
    if (purpose) {
      conditions.push(eq(timeAvailabilities.reservationPurpose, purpose));
    }
    
    // 查询时间预留
    const reservations = await db.query.timeAvailabilities.findMany({
      where: and(...conditions),
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
    console.error('获取顾问时间预留失败:', error);
    return NextResponse.json(
      { success: false, error: '获取顾问时间预留失败' },
      { status: 500 }
    );
  }
}

// POST - 创建顾问时间预留
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      consultantId, 
      studentId, 
      weekDay, 
      timeSlot, 
      purpose = '选课指导',
      notes 
    } = body;
    
    // 验证必填字段
    if (!consultantId || !weekDay || !timeSlot) {
      return NextResponse.json(
        { success: false, error: '顾问ID、星期和时间槽为必填项' },
        { status: 400 }
      );
    }
    
    // 验证顾问存在
    const consultant = await db.query.users.findFirst({
      where: eq(users.id, consultantId),
    });
    
    if (!consultant) {
      return NextResponse.json(
        { success: false, error: '顾问不存在' },
        { status: 404 }
      );
    }
    
    // 验证顾问角色
    if (consultant.role !== '规划顾问' && consultant.role !== '管理员') {
      return NextResponse.json(
        { success: false, error: '该用户不是规划顾问' },
        { status: 400 }
      );
    }
    
    // 如果指定了学生，验证学生存在且属于该顾问
    let student = null;
    if (studentId) {
      student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });
      
      if (!student) {
        return NextResponse.json(
          { success: false, error: '学生不存在' },
          { status: 404 }
        );
      }
      
      // 检查学生是否属于该顾问（可选，根据业务需求）
      if (student.consultantId && student.consultantId !== consultantId) {
        return NextResponse.json(
          { success: false, error: '该学生不属于此顾问' },
          { status: 403 }
        );
      }
    }
    
    // 检查顾问该时间段是否已有预留
    const existingConsultant = await db.query.timeAvailabilities.findFirst({
      where: and(
        eq(timeAvailabilities.userId, consultantId),
        eq(timeAvailabilities.weekDay, weekDay as WeekDay),
        eq(timeAvailabilities.timeSlot, timeSlot as TimeSlot)
      ),
    });
    
    if (existingConsultant) {
      // 更新现有预留
      await db.update(timeAvailabilities)
        .set({
          reservationType: '顾问指导',
          reservationPurpose: purpose as ReservationPurpose,
          studentId: studentId || null,
          notes: notes || null,
          isAvailable: false,
          updatedAt: new Date(),
        })
        .where(eq(timeAvailabilities.id, existingConsultant.id));
      
      const updated = await db.query.timeAvailabilities.findFirst({
        where: eq(timeAvailabilities.id, existingConsultant.id),
      });
      
      return NextResponse.json({
        success: true,
        data: updated,
        message: '顾问时间预留已更新',
      });
    }
    
    // 创建顾问的时间预留
    const reservationId = uuidv4();
    await db.insert(timeAvailabilities).values({
      id: reservationId,
      userId: consultantId,
      userRole: consultant.role as '规划顾问' | '管理员',
      name: consultant.name,
      weekDay: weekDay as WeekDay,
      timeSlot: timeSlot as TimeSlot,
      isAvailable: false,
      reservationType: '顾问指导',
      reservationPurpose: purpose as ReservationPurpose,
      consultantId: consultantId,
      studentId: studentId || null,
      notes: notes || null,
    });
    
    const newReservation = await db.query.timeAvailabilities.findFirst({
      where: eq(timeAvailabilities.id, reservationId),
    });
    
    return NextResponse.json({
      success: true,
      data: newReservation,
      message: '顾问时间预留已创建',
    });
  } catch (error) {
    console.error('创建顾问时间预留失败:', error);
    return NextResponse.json(
      { success: false, error: '创建顾问时间预留失败' },
      { status: 500 }
    );
  }
}
