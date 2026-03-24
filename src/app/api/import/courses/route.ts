/**
 * 课程批量导入 API
 * 
 * POST /api/import/courses
 * 
 * 接收 CSV 格式的课程数据，批量导入数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { courses } from '@/db/schema';
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

// 验证课程类型
const VALID_TYPES = ['基础课', '项目课'];

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
    const requiredHeaders = ['课程编号', '课程名称', '课程类型', '课程分类', '时长'];
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
        const courseId = row[getIndex('课程编号')];
        const name = row[getIndex('课程名称')];
        const type = row[getIndex('课程类型')];
        const category = row[getIndex('课程分类')];
        const duration = row[getIndex('时长')];
        const description = row[getIndex('课程描述')] || '';
        
        // 验证必填字段
        if (!courseId || !name) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 课程编号和课程名称为必填项`);
          continue;
        }
        
        // 验证课程类型
        if (type && !VALID_TYPES.includes(type)) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 课程类型无效，可选值: ${VALID_TYPES.join(', ')}`);
          continue;
        }
        
        // 验证课程分类
        if (category && !VALID_CATEGORIES.includes(category)) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 课程分类无效，可选值: ${VALID_CATEGORIES.join(', ')}`);
          continue;
        }
        
        // 检查课程编号是否已存在
        const existing = await db.query.courses.findFirst({
          where: (courses, { eq }) => eq(courses.courseId, courseId),
        });
        
        if (existing) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 课程编号 ${courseId} 已存在`);
          continue;
        }
        
        // 创建课程记录
        await db.insert(courses).values({
          id: uuidv4(),
          courseId,
          name,
          type: type as any || '基础课',
          category: category as any,
          duration: duration as "4周" | "5周" | "1个月" | "2个月" | "3个月" || '4周',
          description,
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
    console.error('导入课程数据失败:', error);
    return NextResponse.json(
      { success: false, error: `导入失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
