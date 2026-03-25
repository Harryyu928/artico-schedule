/**
 * 顾问管理 API
 * 
 * GET /api/consultants - 获取顾问列表
 * POST /api/consultants - 创建新顾问
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { consultants, users } from '@/db/schema';
import { eq, like, or, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET - 获取顾问列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search');
    const level = searchParams.get('level');
    const isActive = searchParams.get('isActive');

    // 构建查询条件
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(consultants.name, `%${search}%`),
          like(consultants.email, `%${search}%`),
          like(consultants.phone, `%${search}%`)
        )
      );
    }
    
    if (level) {
      conditions.push(eq(consultants.level, level as 'supervisor' | 'senior' | 'standard' | 'trainee'));
    }
    
    if (isActive !== null && isActive !== undefined) {
      conditions.push(eq(consultants.isActive, isActive === 'true'));
    }

    // 查询总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultants)
      .where(conditions.length > 0 ? sql`${conditions.join(' AND ')}` : undefined);
    
    const total = Number(countResult[0]?.count || 0);

    // 查询列表
    const consultantsList = await db.query.consultants.findMany({
      where: conditions.length > 0 ? conditions[0] : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: [desc(consultants.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: consultantsList,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取顾问列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取顾问列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新顾问
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      level = 'standard',
      email,
      phone,
      wechat,
      feishuUserId,
      userId,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '顾问姓名为必填项' },
        { status: 400 }
      );
    }

    // 生成顾问ID
    const consultantId = `C${nanoid(8).toUpperCase()}`;
    const id = nanoid();

    // 创建顾问
    const [newConsultant] = await db.insert(consultants).values({
      id,
      consultantId,
      name,
      level,
      email,
      phone,
      wechat,
      feishuUserId,
      userId,
      notes,
    }).returning();

    return NextResponse.json({
      success: true,
      data: newConsultant,
      message: '顾问创建成功',
    });
  } catch (error) {
    console.error('创建顾问失败:', error);
    return NextResponse.json(
      { success: false, error: '创建顾问失败' },
      { status: 500 }
    );
  }
}
