import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// 工作流定义的模拟数据
const workflowDefinitionsData = [
  {
    id: 'wf-student-onboarding',
    type: 'student_onboarding',
    name: '学生入学流程',
    description: '从学生入学到开始上课的完整流程',
    isActive: true,
    stages: [
      { id: 'stage-1', stageOrder: 1, name: '入学登记', color: '#3B82F6', icon: 'ClipboardList', isRequired: true, tasks: [
        { name: '录入学生基本信息', assigneeRole: '管理员' },
        { name: '确认缴费信息', assigneeRole: '管理员' },
        { name: '分配咨询导师', assigneeRole: '管理员' },
      ]},
      { id: 'stage-2', stageOrder: 2, name: '选课规划', color: '#F59E0B', icon: 'FileText', isRequired: true, tasks: [
        { name: '创建选课单', assigneeRole: '管理员' },
        { name: '添加目标院校', assigneeRole: '管理员' },
        { name: '规划课程明细', assigneeRole: '导师' },
        { name: '确认选课单', assigneeRole: '管理员' },
      ]},
      { id: 'stage-3', stageOrder: 3, name: '时间设置', color: '#8B5CF6', icon: 'Clock', isRequired: true, tasks: [
        { name: '设置学生可用时间', assigneeRole: '管理员' },
        { name: '设置导师可用时间', assigneeRole: '导师' },
      ]},
      { id: 'stage-4', stageOrder: 4, name: '排课安排', color: '#EC4899', icon: 'Calendar', isRequired: true, tasks: [
        { name: '执行自动排课', assigneeRole: '管理员' },
        { name: '确认排课结果', assigneeRole: '导师' },
      ]},
      { id: 'stage-5', stageOrder: 5, name: '开始上课', color: '#10B981', icon: 'PlayCircle', isRequired: true, tasks: [
        { name: '开始第一节课', assigneeRole: '导师' },
      ]},
    ],
  },
  {
    id: 'wf-selection-form',
    type: 'selection_form',
    name: '选课单处理流程',
    description: '选课单从创建到完成的流程',
    isActive: true,
    stages: [
      { id: 'stage-1', stageOrder: 1, name: '草稿', color: '#9CA3AF', icon: 'FileEdit', isRequired: true, tasks: [] },
      { id: 'stage-2', stageOrder: 2, name: '已确认', color: '#3B82F6', icon: 'CheckCircle', isRequired: true, tasks: [] },
      { id: 'stage-3', stageOrder: 3, name: '执行中', color: '#F59E0B', icon: 'Loader', isRequired: true, tasks: [] },
      { id: 'stage-4', stageOrder: 4, name: '已完成', color: '#10B981', icon: 'CheckCircle2', isRequired: true, tasks: [] },
    ],
  },
  {
    id: 'wf-course-progress',
    type: 'course_progress',
    name: '课程进度流程',
    description: '单个课程从开始到完成的流程',
    isActive: true,
    stages: [
      { id: 'stage-1', stageOrder: 1, name: '待排课', color: '#9CA3AF', icon: 'Clock', isRequired: true, tasks: [] },
      { id: 'stage-2', stageOrder: 2, name: '排课中', color: '#3B82F6', icon: 'Calendar', isRequired: true, tasks: [] },
      { id: 'stage-3', stageOrder: 3, name: '上课中', color: '#F59E0B', icon: 'PlayCircle', isRequired: true, tasks: [] },
      { id: 'stage-4', stageOrder: 4, name: '已完成', color: '#10B981', icon: 'CheckCircle2', isRequired: true, tasks: [] },
    ],
  },
  {
    id: 'wf-application-tracking',
    type: 'application_tracking',
    name: '申请跟踪流程',
    description: '学生申请院校的跟踪流程',
    isActive: true,
    stages: [
      { id: 'stage-1', stageOrder: 1, name: '准备中', color: '#9CA3AF', icon: 'FileText', isRequired: true, tasks: [] },
      { id: 'stage-2', stageOrder: 2, name: '已申请', color: '#3B82F6', icon: 'Send', isRequired: true, tasks: [] },
      { id: 'stage-3', stageOrder: 3, name: '等待结果', color: '#F59E0B', icon: 'Hourglass', isRequired: true, tasks: [] },
      { id: 'stage-4', stageOrder: 4, name: '已录取', color: '#10B981', icon: 'Award', isRequired: false, tasks: [] },
      { id: 'stage-5', stageOrder: 5, name: '已拒绝', color: '#EF4444', icon: 'XCircle', isRequired: false, tasks: [] },
    ],
  },
];

// 模拟工作流实例数据
const workflowInstancesData = [
  {
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
      { id: 'stage-1', name: '入学登记', status: 'completed', completedTasks: 3, totalTasks: 3 },
      { id: 'stage-2', name: '选课规划', status: 'in_progress', completedTasks: 0, totalTasks: 4 },
      { id: 'stage-3', name: '时间设置', status: 'pending', completedTasks: 0, totalTasks: 2 },
      { id: 'stage-4', name: '排课安排', status: 'pending', completedTasks: 0, totalTasks: 2 },
      { id: 'stage-5', name: '开始上课', status: 'pending', completedTasks: 0, totalTasks: 1 },
    ],
  },
  {
    id: 'wi-002',
    workflowId: 'wf-student-onboarding',
    workflowName: '学生入学流程',
    entityType: 'student',
    entityId: 'student-2',
    entityName: '李四',
    currentStageId: 'stage-4',
    currentStageName: '排课安排',
    status: 'in_progress',
    progress: 75,
    totalTasks: 8,
    completedTasks: 6,
    startedAt: '2026-03-15T10:00:00Z',
    dueDate: '2026-03-25',
    stages: [
      { id: 'stage-1', name: '入学登记', status: 'completed', completedTasks: 3, totalTasks: 3 },
      { id: 'stage-2', name: '选课规划', status: 'completed', completedTasks: 4, totalTasks: 4 },
      { id: 'stage-3', name: '时间设置', status: 'completed', completedTasks: 2, totalTasks: 2 },
      { id: 'stage-4', name: '排课安排', status: 'in_progress', completedTasks: 1, totalTasks: 2 },
      { id: 'stage-5', name: '开始上课', status: 'pending', completedTasks: 0, totalTasks: 1 },
    ],
  },
  {
    id: 'wi-003',
    workflowId: 'wf-student-onboarding',
    workflowName: '学生入学流程',
    entityType: 'student',
    entityId: '6da98a0c-cad6-46aa-8f86-cb9cfd90a6f1',
    entityName: '测试学生4',
    currentStageId: 'stage-1',
    currentStageName: '入学登记',
    status: 'pending',
    progress: 0,
    totalTasks: 8,
    completedTasks: 0,
    startedAt: '2026-03-24T10:00:00Z',
    stages: [
      { id: 'stage-1', name: '入学登记', status: 'pending', completedTasks: 0, totalTasks: 3 },
      { id: 'stage-2', name: '选课规划', status: 'pending', completedTasks: 0, totalTasks: 4 },
      { id: 'stage-3', name: '时间设置', status: 'pending', completedTasks: 0, totalTasks: 2 },
      { id: 'stage-4', name: '排课安排', status: 'pending', completedTasks: 0, totalTasks: 2 },
      { id: 'stage-5', name: '开始上课', status: 'pending', completedTasks: 0, totalTasks: 1 },
    ],
  },
];

/**
 * GET /api/workflows
 * 获取工作流定义列表
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const includeInstances = searchParams.get('includeInstances') === 'true';

  try {
    let definitions = workflowDefinitionsData;
    
    if (type) {
      definitions = definitions.filter(d => d.type === type);
    }

    const result = includeInstances ? {
      definitions,
      instances: workflowInstancesData,
    } : { definitions };

    return NextResponse.json(result);
  } catch (error) {
    console.error('获取工作流列表失败:', error);
    return NextResponse.json(
      { error: '获取工作流列表失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 * 创建工作流实例
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowType, entityType, entityId, entityName } = body;

    if (!workflowType || !entityType || !entityId) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      );
    }

    const workflowDef = workflowDefinitionsData.find(d => d.type === workflowType);
    if (!workflowDef) {
      return NextResponse.json(
        { error: '工作流类型不存在' },
        { status: 400 }
      );
    }

    const firstStage = workflowDef.stages[0];
    const totalTasks = workflowDef.stages.reduce((sum, stage) => sum + stage.tasks.length, 0);

    const newInstance = {
      id: uuidv4(),
      workflowId: workflowDef.id,
      workflowName: workflowDef.name,
      entityType,
      entityId,
      entityName: entityName || entityId,
      currentStageId: firstStage.id,
      currentStageName: firstStage.name,
      status: 'pending',
      progress: 0,
      totalTasks,
      completedTasks: 0,
      startedAt: new Date().toISOString(),
      stages: workflowDef.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        status: stage.stageOrder === 1 ? 'pending' : 'pending',
        completedTasks: 0,
        totalTasks: stage.tasks.length,
        tasks: stage.tasks.map((task, idx) => ({
          id: `${uuidv4()}`,
          name: task.name,
          status: 'pending',
          assigneeRole: task.assigneeRole,
        })),
      })),
    };

    // 在实际项目中，这里会保存到数据库
    workflowInstancesData.push(newInstance as any);

    return NextResponse.json(newInstance, { status: 201 });
  } catch (error) {
    console.error('创建工作流实例失败:', error);
    return NextResponse.json(
      { error: '创建工作流实例失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}
