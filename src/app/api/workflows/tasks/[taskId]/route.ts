import { NextRequest, NextResponse } from 'next/server';

// 模拟任务数据存储
const tasksData: Record<string, any> = {
  'task-2-1': {
    id: 'task-2-1',
    instanceId: 'wi-001',
    stageId: 'stage-2',
    name: '创建选课单',
    status: 'in_progress',
    assigneeRole: '管理员',
    assigneeId: 'admin-1',
    checklist: [
      { id: 'cl-1', text: '选择学生', completed: true },
      { id: 'cl-2', text: '设置预计日期', completed: false },
      { id: 'cl-3', text: '填写学习目标', completed: false },
    ],
    notes: '',
  },
};

/**
 * GET /api/workflows/tasks/[taskId]
 * 获取任务详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const task = tasksData[taskId];
    
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('获取任务详情失败:', error);
    return NextResponse.json(
      { error: '获取任务详情失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workflows/tasks/[taskId]
 * 更新任务状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const body = await request.json();
    const task = tasksData[taskId];
    
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    // 更新任务
    const updatedTask = {
      ...task,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // 如果状态变为completed，记录完成时间
    if (body.status === 'completed' && task.status !== 'completed') {
      updatedTask.completedAt = new Date().toISOString();
    }

    tasksData[taskId] = updatedTask;

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('更新任务失败:', error);
    return NextResponse.json(
      { error: '更新任务失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workflows/tasks/[taskId]
 * 更新任务清单项
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  try {
    const body = await request.json();
    const { checklistItemId, completed } = body;
    
    const task = tasksData[taskId];
    
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    // 更新清单项
    if (task.checklist && Array.isArray(task.checklist)) {
      const checklistItem = task.checklist.find((item: any) => item.id === checklistItemId);
      if (checklistItem) {
        checklistItem.completed = completed;
      }

      // 计算清单完成进度
      const completedCount = task.checklist.filter((item: any) => item.completed).length;
      const totalCount = task.checklist.length;
      
      // 如果全部完成，自动标记任务为completed
      if (completedCount === totalCount && task.status !== 'completed') {
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
      }
    }

    task.updatedAt = new Date().toISOString();

    return NextResponse.json(task);
  } catch (error) {
    console.error('更新任务清单失败:', error);
    return NextResponse.json(
      { error: '更新任务清单失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}
