import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  workflowDefinitions, 
  workflowStageDefinitions,
  workflowTaskTemplates,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 工作流定义数据
const workflowDefinitionsData = [
  {
    type: 'student_onboarding' as const,
    name: '学生入学流程',
    description: '新学生入学后的完整流程，从登记到开始上课',
    stages: [
      {
        name: '入学登记',
        description: '完成学生基本信息录入和缴费确认',
        color: '#3B82F6',
        icon: 'ClipboardList',
        estimatedDays: 1,
        tasks: [
          { name: '录入学生基本信息', description: '填写学生姓名、专业方向、申请国家等基本信息', assigneeRole: '管理员' as const, priority: 'high' as const },
          { name: '确认缴费信息', description: '核实学生课时购买情况', assigneeRole: '管理员' as const, priority: 'high' as const },
          { name: '分配规划顾问', description: '为学生指定负责的规划顾问', assigneeRole: '管理员' as const, priority: 'high' as const },
        ],
      },
      {
        name: '选课规划',
        description: '创建选课单，规划学习路径',
        color: '#F59E0B',
        icon: 'FileText',
        estimatedDays: 3,
        tasks: [
          { name: '创建选课单', description: '为学生创建新的选课单', assigneeRole: '管理员' as const, priority: 'high' as const },
          { name: '添加目标院校', description: '填写学生申请的目标院校和专业', assigneeRole: '管理员' as const, priority: 'medium' as const },
          { name: '规划课程明细', description: '根据目标院校规划需要学习的课程', assigneeRole: '全职导师' as const, priority: 'high' as const },
          { name: '确认选课单', description: '审核并确认选课单内容', assigneeRole: '管理员' as const, priority: 'high' as const },
        ],
      },
      {
        name: '时间设置',
        description: '设置学生和导师的可用时间',
        color: '#8B5CF6',
        icon: 'Clock',
        estimatedDays: 2,
        tasks: [
          { name: '设置学生可用时间', description: '填写学生每周可上课的时间段', assigneeRole: '管理员' as const, priority: 'medium' as const },
          { name: '设置导师可用时间', description: '确认导师的授课时间段', assigneeRole: '全职导师' as const, priority: 'medium' as const },
        ],
      },
      {
        name: '排课安排',
        description: '执行排课并确认结果',
        color: '#EC4899',
        icon: 'Calendar',
        estimatedDays: 1,
        tasks: [
          { name: '执行自动排课', description: '运行自动排课算法生成课表', assigneeRole: '管理员' as const, priority: 'high' as const },
          { name: '确认排课结果', description: '审核排课结果并通知学生和导师', assigneeRole: '管理员' as const, priority: 'high' as const },
        ],
      },
      {
        name: '开始上课',
        description: '开始第一节课',
        color: '#10B981',
        icon: 'PlayCircle',
        estimatedDays: 1,
        tasks: [
          { name: '开始第一节课', description: '导师完成第一次授课并填写上课记录', assigneeRole: '全职导师' as const, priority: 'high' as const },
        ],
      },
    ],
  },
  {
    type: 'selection_form' as const,
    name: '选课单处理流程',
    description: '选课单从创建到执行完成的完整流程',
    stages: [
      {
        name: '创建选课单',
        description: '规划顾问创建选课单',
        color: '#3B82F6',
        icon: 'FileText',
        estimatedDays: 1,
        tasks: [
          { name: '选择学生', description: '选择需要创建选课单的学生', assigneeRole: '管理员' as const, priority: 'high' as const },
          { name: '设置预计日期', description: '设置学习的开始和结束日期', assigneeRole: '管理员' as const, priority: 'medium' as const },
          { name: '填写学习目标', description: '填写学生的整体学习目标', assigneeRole: '管理员' as const, priority: 'medium' as const },
        ],
      },
      {
        name: '规划课程',
        description: '添加课程明细',
        color: '#F59E0B',
        icon: 'ListTodo',
        estimatedDays: 2,
        tasks: [
          { name: '添加基础课程', description: '添加学生需要学习的基础课程', assigneeRole: '全职导师' as const, priority: 'high' as const },
          { name: '添加项目课程', description: '添加作品集相关的项目课程', assigneeRole: '全职导师' as const, priority: 'high' as const },
          { name: '设置课时规划', description: '为每门课程分配预计课时', assigneeRole: '管理员' as const, priority: 'medium' as const },
        ],
      },
      {
        name: '执行排课',
        description: '将选课单转化为具体课表',
        color: '#8B5CF6',
        icon: 'Calendar',
        estimatedDays: 1,
        tasks: [
          { name: '检查时间匹配', description: '确认学生和导师时间匹配', assigneeRole: '管理员' as const, priority: 'medium' as const },
          { name: '执行排课', description: '运行排课算法生成课表', assigneeRole: '管理员' as const, priority: 'high' as const },
        ],
      },
      {
        name: '确认执行',
        description: '确认选课单开始执行',
        color: '#10B981',
        icon: 'CheckCircle',
        estimatedDays: 1,
        tasks: [
          { name: '更新选课单状态', description: '将选课单状态更新为执行中', assigneeRole: '管理员' as const, priority: 'high' as const },
          { name: '发送通知', description: '通知学生和导师课程安排', assigneeRole: '管理员' as const, priority: 'medium' as const },
        ],
      },
    ],
  },
];

/**
 * GET /api/workflows/init
 * 检查工作流定义是否已初始化
 */
export async function GET() {
  try {
    const existing = await db.select().from(workflowDefinitions);
    
    return NextResponse.json({
      initialized: existing.length > 0,
      count: existing.length,
      definitions: existing.map(d => ({ type: d.type, name: d.name })),
    });
  } catch (error) {
    console.error('检查工作流定义失败:', error);
    return NextResponse.json(
      { error: '检查工作流定义失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows/init
 * 初始化工作流定义
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { force = false } = body;

    // 检查是否已存在
    const existing = await db.select().from(workflowDefinitions);
    
    if (existing.length > 0 && !force) {
      return NextResponse.json({
        message: '工作流定义已存在，跳过初始化',
        count: existing.length,
      });
    }

    // 如果强制初始化，先清除现有数据
    if (force && existing.length > 0) {
      // 删除顺序：任务模板 -> 阶段定义 -> 工作流定义
      for (const def of existing) {
        const stages = await db.select()
          .from(workflowStageDefinitions)
          .where(eq(workflowStageDefinitions.workflowId, def.id));
        
        for (const stage of stages) {
          await db.delete(workflowTaskTemplates)
            .where(eq(workflowTaskTemplates.stageId, stage.id));
        }
        
        await db.delete(workflowStageDefinitions)
          .where(eq(workflowStageDefinitions.workflowId, def.id));
      }
      
      await db.delete(workflowDefinitions);
    }

    // 创建工作流定义
    let totalStages = 0;
    let totalTasks = 0;

    for (const workflowData of workflowDefinitionsData) {
      const workflowId = uuidv4();
      
      // 创建工作流定义
      await db.insert(workflowDefinitions).values({
        id: workflowId,
        type: workflowData.type,
        name: workflowData.name,
        description: workflowData.description,
        isActive: true,
      });

      // 创建阶段定义
      for (let i = 0; i < workflowData.stages.length; i++) {
        const stageData = workflowData.stages[i];
        const stageId = uuidv4();
        
        await db.insert(workflowStageDefinitions).values({
          id: stageId,
          workflowId,
          stageOrder: i + 1,
          name: stageData.name,
          description: stageData.description,
          color: stageData.color,
          icon: stageData.icon,
          isRequired: true,
          autoAdvance: false,
          estimatedDays: stageData.estimatedDays,
        });
        
        totalStages++;

        // 创建任务模板
        for (let j = 0; j < stageData.tasks.length; j++) {
          const taskData = stageData.tasks[j];
          
          await db.insert(workflowTaskTemplates).values({
            id: uuidv4(),
            stageId,
            taskOrder: j + 1,
            name: taskData.name,
            description: taskData.description,
            assigneeRole: taskData.assigneeRole,
            priority: taskData.priority,
          });
          
          totalTasks++;
        }
      }
    }

    return NextResponse.json({
      message: '工作流定义初始化成功',
      workflows: workflowDefinitionsData.length,
      stages: totalStages,
      tasks: totalTasks,
    }, { status: 201 });
  } catch (error) {
    console.error('初始化工作流定义失败:', error);
    return NextResponse.json(
      { error: '初始化工作流定义失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}
