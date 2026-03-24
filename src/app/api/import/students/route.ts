/**
 * 学生批量导入 API
 * 
 * POST /api/import/students
 * 
 * 接收 CSV 格式的学生数据，批量导入数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { students, users } from '@/db/schema';
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

// 验证专业方向
const VALID_MAJORS = ['游戏设计', '游戏美术', '角色设计', '3D游戏美术', '动画'];

// 验证申请国家
const VALID_COUNTRIES = ['美国', '英国', '加拿大', '日本'];

// 验证当前阶段
const VALID_STAGES = ['基础阶段', '项目阶段', '作品集打磨'];

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
    const requiredHeaders = ['学号', '姓名', '专业方向', '申请国家', '当前阶段', '总课时'];
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
      const rowNum = i + 2; // Excel 行号（从第2行开始）
      
      try {
        // 获取字段值
        const studentId = row[getIndex('学号')];
        const name = row[getIndex('姓名')];
        const major = row[getIndex('专业方向')];
        const applicationCountry = row[getIndex('申请国家')];
        const currentStage = row[getIndex('当前阶段')];
        const totalHours = parseInt(row[getIndex('总课时')]) || 100;
        const email = row[getIndex('邮箱')] || null;
        const phone = row[getIndex('电话')] || null;
        const wechat = row[getIndex('微信')] || null;
        
        // 验证必填字段
        if (!studentId || !name) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 学号和姓名为必填项`);
          continue;
        }
        
        // 验证枚举值
        if (major && !VALID_MAJORS.includes(major)) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 专业方向无效，可选值: ${VALID_MAJORS.join(', ')}`);
          continue;
        }
        
        if (applicationCountry && !VALID_COUNTRIES.includes(applicationCountry)) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 申请国家无效，可选值: ${VALID_COUNTRIES.join(', ')}`);
          continue;
        }
        
        if (currentStage && !VALID_STAGES.includes(currentStage)) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 当前阶段无效，可选值: ${VALID_STAGES.join(', ')}`);
          continue;
        }
        
        // 检查学号是否已存在
        const existing = await db.query.students.findFirst({
          where: (students, { eq }) => eq(students.studentId, studentId),
        });
        
        if (existing) {
          results.failed++;
          results.errors.push(`第${rowNum}行: 学号 ${studentId} 已存在`);
          continue;
        }
        
        // 创建学生记录
        const id = uuidv4();
        
        await db.insert(students).values({
          id,
          studentId,
          name,
          major: major as any || '游戏设计',
          applicationCountry: applicationCountry as any || '美国',
          currentStage: currentStage as any || '基础阶段',
          totalHours,
          usedHours: 0,
          email,
          phone,
          wechat,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // 创建关联的用户记录
        await db.insert(users).values({
          id,
          name,
          username: studentId, // 使用学号作为用户名
          email,
          role: '学生',
          studentId: id,
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
    console.error('导入学生数据失败:', error);
    return NextResponse.json(
      { success: false, error: `导入失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
