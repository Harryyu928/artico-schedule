/**
 * 批量时间预留 API
 * 
 * POST /api/time-reservations/batch - 批量创建时间预留
 * DELETE /api/time-reservations/batch - 批量删除时间预留
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timeAvailabilities, students } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { WeekDay, TimeSlot } from '@/types';

type ReservationType = '空闲' | '顾问指导' | '固定课程' | '不可用';

interface BatchReservationItem {
  weekDay: WeekDay;
  timeSlot: TimeSlot;
}

// POST - 批量创建时间预留
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      studentId, 
      consultantId, 
      reservations, 
      reservationType = '顾问指导',
      notes 
    } = body as {
      studentId: string;
      consultantId?: string;
      reservations: BatchReservationItem[];
      reservationType?: ReservationType;
      notes?: string;
    };
    
    // 验证必填字段
    if (!studentId || !reservations || !Array.isArray(reservations) || reservations.length === 0) {
      return NextResponse.json(
        { success: false, error: '学生ID和时间预留列表为必填项' },
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
    
    const results: Array<{
      weekDay: WeekDay;
      timeSlot: TimeSlot;
      action: 'created' | 'updated';
    }> = [];
    
    // 逐个处理时间预留
    for (const item of reservations) {
      const { weekDay, timeSlot } = item;
      
      // 检查是否已有该时间段
      const existing = await db.query.timeAvailabilities.findFirst({
        where: and(
          eq(timeAvailabilities.userId, studentId),
          eq(timeAvailabilities.weekDay, weekDay),
          eq(timeAvailabilities.timeSlot, timeSlot)
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
        
        results.push({ weekDay, timeSlot, action: 'updated' });
      } else {
        // 创建新的时间预留
        const reservationId = uuidv4();
        await db.insert(timeAvailabilities).values({
          id: reservationId,
          userId: studentId,
          userRole: '学生',
          name: student.name,
          weekDay,
          timeSlot,
          isAvailable: reservationType === '空闲',
          reservationType: reservationType as ReservationType,
          consultantId: consultantId || null,
          notes: notes || null,
        });
        
        results.push({ weekDay, timeSlot, action: 'created' });
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
      message: `成功处理 ${results.length} 个时间预留`,
    });
  } catch (error) {
    console.error('批量创建时间预留失败:', error);
    return NextResponse.json(
      { success: false, error: '批量创建时间预留失败' },
      { status: 500 }
    );
  }
}

// DELETE - 批量删除时间预留
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, reservationIds, clearAll } = body as {
      studentId: string;
      reservationIds?: string[];
      clearAll?: boolean;
    };
    
    if (!studentId) {
      return NextResponse.json(
        { success: false, error: '学生ID为必填项' },
        { status: 400 }
      );
    }
    
    if (clearAll) {
      // 清空学生所有时间预留
      await db.delete(timeAvailabilities)
        .where(eq(timeAvailabilities.userId, studentId));
      
      return NextResponse.json({
        success: true,
        message: '已清空所有时间预留',
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
      message: `成功删除 ${reservationIds.length} 个时间预留`,
    });
  } catch (error) {
    console.error('批量删除时间预留失败:', error);
    return NextResponse.json(
      { success: false, error: '批量删除时间预留失败' },
      { status: 500 }
    );
  }
}
