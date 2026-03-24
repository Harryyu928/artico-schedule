/**
 * 学生时间表 API
 * 
 * GET /api/time-table/student/[studentId] - 获取学生时间表
 * POST /api/time-table/student/[studentId] - 保存学生时间表
 * POST /api/time-table/student/[studentId]/confirm - 确认本周时间表
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { timeAvailabilities, students, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 时间段定义
const TIME_SLOTS = ['10:00', '13:00', '15:00', '18:00', '20:00'] as const;
const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

type TimeSlot = typeof TIME_SLOTS[number];
type WeekDay = typeof WEEK_DAYS[number];

// 时间表状态
type TimeTableStatus = '未填写' | '部分填写' | '已填写' | '待确认' | '已确认';

interface TimeSlotEntry {
  weekDay: WeekDay;
  timeSlot: TimeSlot;
  isAvailable: boolean;
}

interface TimeTableResponse {
  studentId: string;
  studentName: string;
  status: TimeTableStatus;
  slots: TimeSlotEntry[];
  totalAvailable: number;
  confirmedAt?: string;
}

// 计算时间表状态
function calculateStatus(slots: TimeSlotEntry[], hasConfirmed: boolean): TimeTableStatus {
  if (hasConfirmed) return '已确认';
  
  const availableCount = slots.filter(s => s.isAvailable).length;
  
  if (availableCount === 0) return '未填写';
  if (availableCount < 5) return '部分填写'; // 至少需要5个时间段才算完整
  return '已填写';
}

// GET - 获取学生时间表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    
    // 获取学生信息
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });
    
    if (!student) {
      return NextResponse.json(
        { success: false, error: '学生不存在' },
        { status: 404 }
      );
    }
    
    // 获取学生时间表
    const existingSlots = await db.query.timeAvailabilities.findMany({
      where: and(
        eq(timeAvailabilities.userId, studentId),
        eq(timeAvailabilities.userRole, '学生'),
        eq(timeAvailabilities.reservationType, '空闲')
      ),
    });
    
    // 构建完整时间表（7天 × 5个时间段 = 35个格子）
    const allSlots: TimeSlotEntry[] = [];
    
    for (const weekDay of WEEK_DAYS) {
      for (const timeSlot of TIME_SLOTS) {
        const existing = existingSlots.find(
          s => s.weekDay === weekDay && s.timeSlot === timeSlot
        );
        
        allSlots.push({
          weekDay,
          timeSlot,
          isAvailable: existing?.isAvailable ?? false,
        });
      }
    }
    
    // 检查是否有确认记录
    const confirmedSlot = existingSlots.find(s => s.notes?.includes('confirmed:'));
    const confirmedAt = confirmedSlot?.notes?.match(/confirmed:(\d{4}-\d{2}-\d{2})/)?.[1];
    
    const status = calculateStatus(allSlots, !!confirmedAt);
    const totalAvailable = allSlots.filter(s => s.isAvailable).length;
    
    const response: TimeTableResponse = {
      studentId,
      studentName: student.name,
      status,
      slots: allSlots,
      totalAvailable,
      confirmedAt,
    };
    
    return NextResponse.json({ success: true, data: response });
    
  } catch (error) {
    console.error('获取学生时间表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取时间表失败' },
      { status: 500 }
    );
  }
}

// POST - 保存学生时间表
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const body = await request.json();
    const { slots } = body as { slots: TimeSlotEntry[] };
    
    if (!slots || !Array.isArray(slots)) {
      return NextResponse.json(
        { success: false, error: '无效的时间表数据' },
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
    
    // 删除旧的时间表记录
    await db.delete(timeAvailabilities).where(
      and(
        eq(timeAvailabilities.userId, studentId),
        eq(timeAvailabilities.userRole, '学生'),
        eq(timeAvailabilities.reservationType, '空闲')
      )
    );
    
    // 插入新的时间表记录
    const newRecords = slots
      .filter(s => s.isAvailable)
      .map(slot => ({
        id: uuidv4(),
        userId: studentId,
        userRole: '学生' as const,
        name: `${student.name}的时间表`,
        weekDay: slot.weekDay,
        timeSlot: slot.timeSlot,
        isAvailable: true,
        reservationType: '空闲' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    
    if (newRecords.length > 0) {
      await db.insert(timeAvailabilities).values(newRecords);
    }
    
    const status = calculateStatus(slots, false);
    const totalAvailable = slots.filter(s => s.isAvailable).length;
    
    return NextResponse.json({
      success: true,
      data: {
        studentId,
        status,
        totalAvailable,
        savedSlots: newRecords.length,
      },
    });
    
  } catch (error) {
    console.error('保存学生时间表失败:', error);
    return NextResponse.json(
      { success: false, error: '保存时间表失败' },
      { status: 500 }
    );
  }
}

// PUT - 确认本周时间表
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const today = new Date().toISOString().split('T')[0];
    
    // 更新确认标记
    await db.update(timeAvailabilities)
      .set({
        notes: `confirmed:${today}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(timeAvailabilities.userId, studentId),
          eq(timeAvailabilities.userRole, '学生')
        )
      );
    
    return NextResponse.json({
      success: true,
      data: { confirmedAt: today },
    });
    
  } catch (error) {
    console.error('确认时间表失败:', error);
    return NextResponse.json(
      { success: false, error: '确认时间表失败' },
      { status: 500 }
    );
  }
}
