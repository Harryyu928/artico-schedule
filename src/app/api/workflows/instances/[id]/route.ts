import { NextRequest, NextResponse } from 'next/server';

// 模拟工作流实例数据
const workflowInstancesData: Record<string, any> = {
  'wi-001': {
    id: 'wi-001',
    workflowId: 'wf-student-onboarding',
    workflowName: '学生入学流程',
    entityType: 'student',
    entityId: 'student-1',
    entityName: '张三',
    currentStageId: 'stage-2',
    currentStageName: '选课规划',
    status: 'in_progress',
    progress: 40,
    totalTasks: 8,
    completedTasks: 3,
    startedAt: '2026-03-20T10:00:00Z',
    dueDate: '2026-04-01',
    stages: [
      { 
        id: 'stage-1', 
        stageOrder: 1,
        name: '入学登记', 
        color: '#3B82F6',
        icon: 'ClipboardList',
        status: 'completed', 
        completedTasks: 3, 
        totalTasks: 3,
        tasks: [
          { id: 'task-1-1', name: '录入学生基本信息', status: 'completed', assigneeRole: '管理员', completedAt: '2026-03-20T10:30:00Z' },
          { id: 'task-1-2', name: '确认缴费信息', status: 'completed', assigneeRole: '管理员', completedAt: '2026-03-20T11:00:00Z' },
          { id: 'task-1-3', name: '分配咨询导师', status: 'completed', assigneeRole: '管理员', completedAt: '2026-03-20T14:00:00Z' },
        ]
      },
      { 
        id: 'stage-2', 
        stageOrder: 2,
        name: '选课规划', 
        color: '#F59E0B',
        icon: 'FileText',
        status: 'in_progress', 
        completedTasks: 0, 
        totalTasks: 4,
        tasks: [
          { id: 'task-2-1', name: '创建选课单', status: 'in_progress', assigneeRole: '管理员', assigneeId: 'admin-1' },
          { id: 'task-2-2', name: '添加目标院校', status: 'pending', assigneeRole: '管理员' },
          { id: 'task-2-3', name: '规划课程明细', status: 'pending', assigneeRole: '导师' },
          { id: 'task-2-4', name: '确认选课单', status: 'pending', assigneeRole: '管理员' },
        ]
      },
      { 
        id: 'stage-3', 
        stageOrder: 3,
        name: '时间设置', 
        color: '#8B5CF6',
        icon: 'Clock',
        status: 'pending', 
        completedTasks: 0, 
        totalTasks: 2,
        tasks: [
          { id: 'task-3-1', name: '设置学生可用时间', status: 'pending', assigneeRole: '管理员' },
          { id: 'task-3-2', name: '设置导师可用时间', status: 'pending', assigneeRole: '导师' },
        ]
      },
      { 
        id: 'stage-4', 
        stageOrder: 4,
        name: '排课安排', 
        color: '#EC4899',
        icon: 'Calendar',
        status: 'pending', 
        completedTasks: 0, 
        totalTasks: 2,
        tasks: [
          { id: 'task-4-1', name: '执行自动排课', status: 'pending', assigneeRole: '管理员' },
          { id: 'task-4-2', name: '确认排课结果', status: 'pending', assigneeRole: '导师' },
        ]
      },
      { 
        id: 'stage-5', 
        stageOrder: 5,
        name: '开始上课', 
        color: '#10B981',
        icon: 'PlayCircle',
        status: 'pending', 
        completedTasks: 0, 
        totalTasks: 1,
        tasks: [
          { id: 'task-5-1', name: '开始第一节课', status: 'pending', assigneeRole: '导师' },
        ]
      },
    ],
  },
};

/**
 * GET /api/workflows/instances/[id]
 * 获取工作流实例详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const instance = workflowInstancesData[id];
    
    if (!instance) {
      return NextResponse.json(
        { error: '工作流实例不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(instance);
  } catch (error) {
    console.error('获取工作流实例详情失败:', error);
    return NextResponse.json(
      { error: '获取工作流实例详情失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workflows/instances/[id]
 * 更新工作流实例状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const instance = workflowInstancesData[id];
    
    if (!instance) {
      return NextResponse.json(
        { error: '工作流实例不存在' },
        { status: 404 }
      );
    }

    // 更新实例
    const updatedInstance = {
      ...instance,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    workflowInstancesData[id] = updatedInstance;

    return NextResponse.json(updatedInstance);
  } catch (error) {
    console.error('更新工作流实例失败:', error);
    return NextResponse.json(
      { error: '更新工作流实例失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}
