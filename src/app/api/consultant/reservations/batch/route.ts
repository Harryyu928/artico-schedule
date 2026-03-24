/**
 * 顾问批量时间预留 API
 * 
 * POST /api/consultant/reservations/batch - 批量创建顾问时间预留
 * DELETE /api/consultant/reservations/batch - 批量删除顾问时间预留
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeAvailabilities, students, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { WeekDay, TimeSlot } from '@/types';

type ReservationPurpose = '填写时间表' | '预约上课' | '选课指导' | '其他';

interface BatchReservationItem {
  weekDay: WeekDay;
  timeSlot: TimeSlot;
  studentId?: string; // 可选，为特定学生预留
}

// POST - 批量创建顾问时间预留
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      consultantId, 
      reservations, 
      purpose = '选课指导',
      studentId, // 可选，统一为某个学生预留
      notes 
    } = body as {
      consultantId: string;
      reservations: BatchReservationItem[];
      purpose?: ReservationPurpose;
      studentId?: string;
      notes?: string;
    };
    
    // 验证必填字段
    if (!consultantId || !reservations || !Array.isArray(reservations) || reservations.length === 0) {
      return NextResponse.json(
        { success: false, error: '顾问ID和时间预留列表为必填项' },
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
    
    // 如果统一指定了学生，验证学生存在
    if (studentId) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });
      
      if (!student) {
        return NextResponse.json(
          { success: false, error: '学生不存在' },
          { status: 404 }
        );
      }
    }
    
    const results: Array<{
      weekDay: WeekDay;
      timeSlot: TimeSlot;
      studentId?: string;
      action: 'created' | 'updated';
    }> = [];
    
    // 逐个处理时间预留
    for (const item of reservations) {
      const { weekDay, timeSlot, studentId: itemStudentId } = item;
      const targetStudentId = itemStudentId || studentId || null;
      
      // 检查顾问该时间段是否已有预留
      const existing = await db.query.timeAvailabilities.findFirst({
        where: and(
          eq(timeAvailabilities.userId, consultantId),
          eq(timeAvailabilities.weekDay, weekDay),
          eq(timeAvailabilities.timeSlot, timeSlot)
        ),
      });
      
      if (existing) {
        // 更新现有预留
        await db.update(timeAvailabilities)
          .set({
            reservationType: '顾问指导',
            reservationPurpose: purpose as ReservationPurpose,
            studentId: targetStudentId,
            notes: notes || null,
            isAvailable: false,
            updatedAt: new Date(),
          })
          .where(eq(timeAvailabilities.id, existing.id));
        
        results.push({ weekDay, timeSlot, studentId: targetStudentId || undefined, action: 'updated' });
      } else {
        // 创建新的时间预留
        const reservationId = uuidv4();
        await db.insert(timeAvailabilities).values({
          id: reservationId,
          userId: consultantId,
          userRole: consultant.role as '规划顾问' | '管理员',
          name: consultant.name,
          weekDay,
          timeSlot,
          isAvailable: false,
          reservationType: '顾问指导',
          reservationPurpose: purpose as ReservationPurpose,
          consultantId: consultantId,
          studentId: targetStudentId,
          notes: notes || null,
        });
        
        results.push({ weekDay, timeSlot, studentId: targetStudentId || undefined, action: 'created' });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        created: results.filter(r => r.action === 'created').length,
        updated: results.filter(r => r.action === 'updated').length,
        details: results,
      },
      message: `成功处理 ${results.length} 个顾问时间预留`,
    });
  } catch (error) {
    console.error('批量创建顾问时间预留失败:', error);
    return NextResponse.json(
      { success: false, error: '批量创建顾问时间预留失败' },
      { status: 500 }
    );
  }
}

// DELETE - 批量删除顾问时间预留
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultantId, reservationIds, clearAll } = body as {
      consultantId: string;
      reservationIds?: string[];
      clearAll?: boolean;
    };
    
    if (!consultantId) {
      return NextResponse.json(
        { success: false, error: '顾问ID为必填项' },
        { status: 400 }
      );
    }
    
    if (clearAll) {
      // 清空顾问所有时间预留
      await db.delete(timeAvailabilities)
        .where(eq(timeAvailabilities.consultantId, consultantId));
      
      return NextResponse.json({
        success: true,
        message: '已清空所有顾问时间预留',
      });
    }
    
    if (!reservationIds || !Array.isArray(reservationIds) || reservationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要删除的时间预留ID列表' },
        { status: 400 }
      );
    }
    
    // 批量删除
    await db.delete(timeAvailabilities)
      .where(inArray(timeAvailabilities.id, reservationIds));
    
    return NextResponse.json({
      success: true,
      message: `成功删除 ${reservationIds.length} 个顾问时间预留`,
    });
  } catch (error) {
    console.error('批量删除顾问时间预留失败:', error);
    return NextResponse.json(
      { success: false, error: '批量删除顾问时间预留失败' },
      { status: 500 }
    );
  }
}
