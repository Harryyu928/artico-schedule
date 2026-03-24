/**
 * 模板下载 API
 * 
 * GET /api/import/template/[type]
 * 
 * 返回 CSV 模板文件供下载
 */

import { NextRequest, NextResponse } from 'next/server';

// 学生模板内容
const STUDENT_TEMPLATE = `学号,姓名,专业方向,申请国家,当前阶段,总课时,邮箱,电话,微信
2024001,张三,游戏设计,美国,基础阶段,100,zhang@example.com,13800138001,zhangsan_wx
2024002,李四,游戏美术,英国,项目阶段,150,li@example.com,13800138002,lisi_wx
2024003,王五,动画,加拿大,作品集打磨,80,wang@example.com,13800138003,wangwu_wx`;

// 导师模板内容
const TEACHER_TEMPLATE = `工号,姓名,类型,可教授课程,每周最大课时,邮箱,电话
T001,王老师,全职,"F-GD,F-GA,P-GD",20,wang@artico.com,13900139001
T002,李老师,全职,"F-AN,P-AN,F-3D",20,li@artico.com,13900139002
T003,张老师,兼职,"F-TA,P-3DGA",10,zhang@artico.com,13900139003`;

// 课程模板内容
const COURSE_TEMPLATE = `课程编号,课程名称,课程类型,课程分类,时长,课程描述
F-GD-001,游戏设计基础,基础课,F-GD,4周,学习游戏设计的基本原理，包括游戏机制、关卡设计、玩家体验等核心概念。
F-GA-001,游戏美术基础,基础课,F-GA,4周,学习游戏美术的基本技能，包括色彩理论、构图、视觉设计等基础知识。
F-AN-001,动画基础,基础课,F-AN,4周,学习动画的基本原理，包括运动规律、时间节奏、角色动画等核心技能。
P-GD-001,游戏设计项目,项目课,P-GD,3个月,完成一个完整的游戏设计项目，从概念设计到原型制作，体验完整开发流程。
P-GA-001,游戏美术项目,项目课,P-GA,2个月,完成游戏美术作品集项目，包括场景设计、角色设计、UI设计等综合训练。`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  
  let content: string;
  let filename: string;
  
  switch (type) {
    case 'students':
      content = STUDENT_TEMPLATE;
      filename = '学生导入模板.csv';
      break;
    case 'teachers':
      content = TEACHER_TEMPLATE;
      filename = '导师导入模板.csv';
      break;
    case 'courses':
      content = COURSE_TEMPLATE;
      filename = '课程导入模板.csv';
      break;
    default:
      return NextResponse.json(
        { success: false, error: '未知的模板类型' },
        { status: 400 }
      );
  }
  
  // 返回 CSV 文件
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
