/**
 * 导师时间表 API
 * 
 * GET /api/time-table/teacher/[teacherId] - 获取导师时间表
 * POST /api/time-table/teacher/[teacherId] - 保存导师默认时间模板
 * PUT /api/time-table/teacher/[teacherId] - 确认本周时间表
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { timeAvailabilities, teachers, users, scheduleResults } from '@/db/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 时间段定义
const TIME_SLOTS = ['10:00', '13:00', '15:00', '18:00', '20:00'] as const;
const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

type TimeSlot = typeof TIME_SLOTS[number];
type WeekDay = typeof WEEK_DAYS[number];

// 时间段状态
type SlotStatus = 'available' | 'scheduled' | 'conflict' | 'unavailable';

interface TimeSlotEntry {
  weekDay: WeekDay;
  timeSlot: TimeSlot;
  isAvailable: boolean;
  status: SlotStatus;
  scheduledInfo?: {
    studentName: string;
    courseName: string;
  };
}

interface TimeTableResponse {
  teacherId: string;
  teacherName: string;
  defaultTemplate: TimeSlotEntry[];
  weeklySchedule: {
    weekStart: string;
    weekEnd: string;
    slots: TimeSlotEntry[];
    confirmedAt?: string;
  };
  weeklyStats: {
    totalAvailable: number;
    scheduled: number;
    remaining: number;
    currentHours: number;
    maxHours: number;
  };
}

// 获取本周日期范围
function getWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

// GET - 获取导师时间表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params;
    
    // 获取导师信息
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.id, teacherId),
    });
    
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: '导师不存在' },
        { status: 404 }
      );
    }
    
    // 获取导师默认时间模板
    const defaultSlots = await db.query.timeAvailabilities.findMany({
      where: and(
        eq(timeAvailabilities.userId, teacherId),
        eq(timeAvailabilities.userRole, teacher.teacherType === '全职' ? '全职导师' : '兼职导师'),
        eq(timeAvailabilities.notes, 'default_template')
      ),
    });
    
    // 获取本周时间表
    const weeklySlots = await db.query.timeAvailabilities.findMany({
      where: and(
        eq(timeAvailabilities.userId, teacherId),
        eq(timeAvailabilities.notes, 'weekly_schedule')
      ),
    });
    
    // 构建完整时间表
    const buildSlotTable = (existingSlots: typeof defaultSlots): TimeSlotEntry[] => {
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
            status: existing?.isAvailable ? 'available' : 'unavailable',
          });
        }
      }
      
      return allSlots;
    };
    
    const { weekStart, weekEnd } = getWeekRange();
    
    // 检查确认状态
    const confirmedSlot = weeklySlots.find(s => s.notes?.includes('confirmed:'));
    const confirmedAt = confirmedSlot?.notes?.match(/confirmed:(\d{4}-\d{2}-\d{2})/)?.[1];
    
    // 计算统计
    const availableSlots = weeklySlots.filter(s => s.isAvailable);
    const totalAvailable = availableSlots.length;
    
    const response: TimeTableResponse = {
      teacherId,
      teacherName: teacher.name,
      defaultTemplate: buildSlotTable(defaultSlots),
      weeklySchedule: {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        slots: weeklySlots.length > 0 ? buildSlotTable(weeklySlots) : buildSlotTable(defaultSlots),
        confirmedAt,
      },
      weeklyStats: {
        totalAvailable,
        scheduled: 0, // TODO: 查询已排课数量
        remaining: totalAvailable * 2, // 每个时间段2小时
        currentHours: teacher.currentHours,
        maxHours: teacher.maxWeeklyHours,
      },
    };
    
    return NextResponse.json({ success: true, data: response });
    
  } catch (error) {
    console.error('获取导师时间表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取时间表失败' },
      { status: 500 }
    );
  }
}

// POST - 保存导师默认时间模板
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params;
    const body = await request.json();
    const { slots, isDefault } = body as { slots: TimeSlotEntry[]; isDefault?: boolean };
    
    if (!slots || !Array.isArray(slots)) {
      return NextResponse.json(
        { success: false, error: '无效的时间表数据' },
        { status: 400 }
      );
    }
    
    // 验证导师存在
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.id, teacherId),
    });
    
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: '导师不存在' },
        { status: 404 }
      );
    }
    
    const noteType = isDefault ? 'default_template' : 'weekly_schedule';
    
    // 删除旧的时间表记录
    await db.delete(timeAvailabilities).where(
      and(
        eq(timeAvailabilities.userId, teacherId),
        eq(timeAvailabilities.notes, noteType)
      )
    );
    
    // 插入新的时间表记录
    const newRecords = slots
      .filter(s => s.isAvailable)
      .map(slot => ({
        id: uuidv4(),
        userId: teacherId,
        userRole: (teacher.teacherType === '全职' ? '全职导师' : '兼职导师') as '全职导师' | '兼职导师',
        name: `${teacher.name}的时间表`,
        weekDay: slot.weekDay,
        timeSlot: slot.timeSlot,
        isAvailable: true,
        reservationType: '空闲' as const,
        notes: noteType,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    
    if (newRecords.length > 0) {
      await db.insert(timeAvailabilities).values(newRecords);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        teacherId,
        savedSlots: newRecords.length,
        isDefault: isDefault ?? false,
      },
    });
    
  } catch (error) {
    console.error('保存导师时间表失败:', error);
    return NextResponse.json(
      { success: false, error: '保存时间表失败' },
      { status: 500 }
    );
  }
}

// PUT - 确认本周时间表
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params;
    const today = new Date().toISOString().split('T')[0];
    
    // 更新确认标记
    await db.update(timeAvailabilities)
      .set({
        notes: `confirmed:${today}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(timeAvailabilities.userId, teacherId),
          eq(timeAvailabilities.notes, 'weekly_schedule')
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

// PATCH - 临时调整（请假/加课）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params;
    const body = await request.json();
    const { date, timeSlot, action, reason } = body as {
      date: string;
      timeSlot: TimeSlot;
      action: 'add' | 'remove';
      reason?: string;
    };
    
    if (action === 'remove') {
      // 请假 - 标记为不可用
      await db.update(timeAvailabilities)
        .set({
          isAvailable: false,
          reservationType: '不可用',
          notes: reason || '临时请假',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(timeAvailabilities.userId, teacherId),
            eq(timeAvailabilities.timeSlot, timeSlot)
          )
        );
    } else {
      // 加课 - 添加可用时间
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, teacherId),
      });
      
      if (teacher) {
        await db.insert(timeAvailabilities).values({
          id: uuidv4(),
          userId: teacherId,
          userRole: (teacher.teacherType === '全职' ? '全职导师' : '兼职导师') as '全职导师' | '兼职导师',
          name: `${teacher.name}的临时时间`,
          weekDay: '周一', // TODO: 根据date计算
          timeSlot,
          isAvailable: true,
          reservationType: '空闲',
          notes: '临时增加',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: { action, date, timeSlot },
    });
    
  } catch (error) {
    console.error('临时调整失败:', error);
    return NextResponse.json(
      { success: false, error: '临时调整失败' },
      { status: 500 }
    );
  }
}
