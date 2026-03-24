/**
 * 导师批量导入 API
 * 
 * POST /api/import/teachers
 * 
 * 接收 CSV 格式的导师数据，批量导入数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teachers, users } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

// 解析 CSV 行
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// 解析 CSV 文本
function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV 文件为空');
  }
  
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCSVLine(line));
  
  return { headers, rows };
}

// 验证导师类型
const VALID_TYPES = ['全职', '兼职'];

// 验证课程分类
const VALID_CATEGORIES = ['F-GD', 'F-TA', 'F-GA', 'F-3D', 'F-AN', 'P-GD', 'P-AN', 'P-GA', 'P-CA', 'P-3DGA'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择要导入的文件' },
        { status: 400 }
      );
    }
    
    // 读取文件内容
    const csvText = await file.text();
    
    // 解析 CSV
    const { headers, rows } = parseCSV(csvText);
    
    // 验证表头
    const requiredHeaders = ['工号', '姓名', '类型', '可教授课程', '每周最大课时'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { success: false, error: `缺少必填字段: ${missingHeaders.join(', ')}` },
        { status: 400 }
      );
    }
    
    // 获取字段索引
    const getIndex = (name: string) => headers.indexOf(name);
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    // 逐行处理
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      
      try {
        // 获取字段值
        const teacherId = row[getIndex('工号')];
        const name = row[getIndex('姓名')];
        const teacherType = row[getIndex('类型')];
        const teachableCoursesStr = row[getIndex('可教授课程')];
        const maxWeeklyHours = parseInt(row[getIndex('每周最大课时')]) || 20;
        const email = row[getIndex('邮箱')] || null;
        const phone = row[getIndex('电话')] || null;
        
        // 验证必填字段
        if (!teacherId || !name) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 工号和姓名为必填项`);
          continue;
        }
        
        // 验证导师类型
        if (teacherType && !VALID_TYPES.includes(teacherType)) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 类型无效，可选值: ${VALID_TYPES.join(', ')}`);
          continue;
        }
        
        // 解析可教授课程
        let teachableCourses: string[] = [];
        if (teachableCoursesStr) {
          teachableCourses = teachableCoursesStr.split(',').map(c => c.trim());
          
          // 验证课程分类
          const invalidCourses = teachableCourses.filter(c => !VALID_CATEGORIES.includes(c));
          if (invalidCourses.length > 0) {
            results.failed++;
            results.errors.push(`第${rowNum}行: 课程分类无效: ${invalidCourses.join(', ')}`);
            continue;
          }
        }
        
        // 检查工号是否已存在
        const existing = await db.query.teachers.findFirst({
          where: (teachers, { eq }) => eq(teachers.teacherId, teacherId),
        });
        
        if (existing) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 工号 ${teacherId} 已存在`);
          continue;
        }
        
        // 创建导师记录
        const id = uuidv4();
        
        await db.insert(teachers).values({
          id,
          teacherId,
          name,
          teacherType: teacherType as '全职' | '兼职' || '全职',
          teachableCourses: teachableCourses as any,
          maxWeeklyHours,
          currentHours: 0,
          email,
          phone,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // 创建关联的用户记录
        await db.insert(users).values({
          id,
          name,
          username: teacherId, // 使用工号作为用户名
          email,
          role: (teacherType === '兼职' ? '兼职导师' : '全职导师') as any,
          teacherId: id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        results.success++;
        
      } catch (error) {
        results.failed++;
        results.errors.push(`第${rowNum}行: ${(error as Error).message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `导入完成: 成功 ${results.success} 条，失败 ${results.failed} 条`,
      results,
    });
    
  } catch (error) {
    console.error('导入导师数据失败:', error);
    return NextResponse.json(
      { success: false, error: `导入失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
