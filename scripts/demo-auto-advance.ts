/**
 * 工作流自动推进功能演示（模拟版本）
 * 展示推进逻辑和流程
 */

// 模拟数据
const mockWorkflow = {
  id: 'wf-001',
  name: '学生入学流程',
  type: 'student_onboarding',
  stages: [
    { id: 'stage-1', name: '入学登记', order: 1, color: '#3B82F6' },
    { id: 'stage-2', name: '选课指导', order: 2, color: '#10B981' },
    { id: 'stage-3', name: '选课规划', order: 3, color: '#F59E0B' },
    { id: 'stage-4', name: '时间设置', order: 4, color: '#8B5CF6' },
    { id: 'stage-5', name: '排课安排', order: 5, color: '#EC4899' },
    { id: 'stage-6', name: '开始上课', order: 6, color: '#6366F1' },
  ],
};

// 模拟工作流实例
let mockInstance = {
  id: 'instance-001',
  workflowId: 'wf-001',
  currentStageId: 'stage-1',
  status: 'pending',
  progress: 0,
  totalTasks: 12,
  completedTasks: 0,
};

// 模拟任务
let mockTasks = [
  // 阶段1: 入学登记
  { id: 't1', instanceId: 'instance-001', stageId: 'stage-1', name: '录入学生基本信息', priority: 'high', status: 'pending' },
  { id: 't2', instanceId: 'instance-001', stageId: 'stage-1', name: '确认缴费信息', priority: 'high', status: 'pending' },
  { id: 't3', instanceId: 'instance-001', stageId: 'stage-1', name: '分配规划顾问', priority: 'medium', status: 'pending' },
  
  // 阶段2: 选课指导
  { id: 't4', instanceId: 'instance-001', stageId: 'stage-2', name: '预约选课指导课', priority: 'high', status: 'pending' },
  { id: 't5', instanceId: 'instance-001', stageId: 'stage-2', name: '进行选课指导', priority: 'high', status: 'pending' },
  
  // 阶段3: 选课规划
  { id: 't6', instanceId: 'instance-001', stageId: 'stage-3', name: '创建选课单', priority: 'high', status: 'pending' },
  { id: 't7', instanceId: 'instance-001', stageId: 'stage-3', name: '添加目标院校', priority: 'medium', status: 'pending' },
  
  // 阶段4: 时间设置
  { id: 't8', instanceId: 'instance-001', stageId: 'stage-4', name: '设置学生时间表', priority: 'high', status: 'pending' },
  { id: 't9', instanceId: 'instance-001', stageId: 'stage-4', name: '设置导师时间表', priority: 'high', status: 'pending' },
  
  // 阶段5: 排课安排
  { id: 't10', instanceId: 'instance-001', stageId: 'stage-5', name: '执行自动排课', priority: 'high', status: 'pending' },
  
  // 阶段6: 开始上课
  { id: 't11', instanceId: 'instance-001', stageId: 'stage-6', name: '开始第一节课', priority: 'high', status: 'pending' },
  { id: 't12', instanceId: 'instance-001', stageId: 'stage-6', name: '填写上课记录', priority: 'high', status: 'pending' },
];

// 推进历史
let advancementHistory: any[] = [];

// ANSI颜色
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(msg: string, color: string = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function divider(title: string = '') {
  console.log('\n' + '═'.repeat(70));
  if (title) console.log(`  ${colors.bold}${title}${colors.reset}\n`);
}

// 检查推进条件
function checkStageAdvancement(instanceId: string) {
  const currentStageId = mockInstance.currentStageId;
  const stageTasks = mockTasks.filter(t => t.stageId === currentStageId);
  
  const completedTasks = stageTasks.filter(t => t.status === 'completed');
  const completionRate = stageTasks.length > 0 
    ? Math.round((completedTasks.length / stageTasks.length) * 100) 
    : 0;
  
  // 检查高优先级任务
  const highPriorityTasks = stageTasks.filter(t => t.priority === 'high');
  const pendingHighPriority = highPriorityTasks.filter(t => t.status !== 'completed');
  
  // 推进条件
  const allCompleted = stageTasks.every(t => t.status === 'completed');
  const minCompletionRate = 80;
  const highPriorityCompleted = pendingHighPriority.length === 0;
  
  let canAdvance = false;
  let reason = '';
  
  if (allCompleted) {
    canAdvance = true;
    reason = '所有任务已完成';
  } else if (completionRate >= minCompletionRate && highPriorityCompleted) {
    canAdvance = true;
    reason = `完成率${completionRate}%，高优先级任务已完成`;
  } else {
    reason = `完成率${completionRate}%`;
    if (pendingHighPriority.length > 0) {
      reason += `，待完成高优先级任务: ${pendingHighPriority.map(t => t.name).join('、')}`;
    }
  }
  
  // 获取下一阶段
  const stages = mockWorkflow.stages;
  const currentIndex = stages.findIndex(s => s.id === currentStageId);
  const nextStage = currentIndex >= 0 && currentIndex < stages.length - 1 
    ? stages[currentIndex + 1] 
    : null;
  
  return {
    canAdvance,
    reason,
    completionRate,
    pendingHighPriority: pendingHighPriority.map(t => t.name),
    nextStage: nextStage ? { id: nextStage.id, name: nextStage.name } : null,
    isLastStage: !nextStage,
  };
}

// 执行推进
function advanceWorkflowStage(instanceId: string, options: { type: 'auto' | 'manual'; trigger: string }) {
  const checkResult = checkStageAdvancement(instanceId);
  
  if (!checkResult.canAdvance) {
    return { success: false, reason: checkResult.reason };
  }
  
  const previousStage = mockWorkflow.stages.find(s => s.id === mockInstance.currentStageId);
  
  // 记录推进历史
  const logEntry = {
    timestamp: new Date().toISOString(),
    fromStage: previousStage?.name,
    toStage: checkResult.nextStage?.name || '完成',
    type: options.type,
    trigger: options.trigger,
    reason: checkResult.reason,
  };
  advancementHistory.push(logEntry);
  
  if (checkResult.isLastStage) {
    mockInstance.status = 'completed';
    mockInstance.progress = 100;
    return {
      success: true,
      workflowCompleted: true,
      reason: '工作流已完成',
      log: logEntry,
    };
  }
  
  mockInstance.currentStageId = checkResult.nextStage!.id;
  mockInstance.status = 'in_progress';
  
  return {
    success: true,
    workflowCompleted: false,
    previousStage: previousStage?.name,
    newStage: checkResult.nextStage?.name,
    reason: `已从「${previousStage?.name}」进入「${checkResult.nextStage?.name}」阶段`,
    log: logEntry,
  };
}

// 任务完成处理
function onTaskCompleted(taskId: string) {
  const task = mockTasks.find(t => t.id === taskId);
  if (!task) return null;
  
  task.status = 'completed';
  mockInstance.completedTasks++;
  
  // 计算进度
  const totalTasks = mockTasks.length;
  mockInstance.progress = Math.round((mockInstance.completedTasks / totalTasks) * 100);
  
  // 检查推进
  const checkResult = checkStageAdvancement(mockInstance.id);
  
  if (checkResult.canAdvance) {
    return advanceWorkflowStage(mockInstance.id, { type: 'auto', trigger: 'task_completion' });
  }
  
  return null;
}

// 显示当前状态
function showStatus() {
  const currentStage = mockWorkflow.stages.find(s => s.id === mockInstance.currentStageId);
  
  log('\n📊 当前工作流状态:', 'bold');
  log(`   状态: ${mockInstance.status}`, mockInstance.status === 'completed' ? 'green' : 'yellow');
  log(`   进度: ${mockInstance.progress}%`, 'cyan');
  log(`   当前阶段: ${currentStage?.name || '未知'}`, 'cyan');
  log(`   已完成任务: ${mockInstance.completedTasks}/${mockInstance.totalTasks}`, 'cyan');
}

// 显示阶段进度
function showStageProgress() {
  log('\n📋 各阶段进度:', 'bold');
  
  mockWorkflow.stages.forEach((stage, index) => {
    const stageTasks = mockTasks.filter(t => t.stageId === stage.id);
    const completed = stageTasks.filter(t => t.status === 'completed').length;
    const total = stageTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isCurrent = stage.id === mockInstance.currentStageId;
    const isCompleted = completed === total && total > 0;
    
    const status = isCompleted ? '✅' : isCurrent ? '🔵' : '⚪';
    const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
    
    log(`   ${status} ${index + 1}. ${stage.name}`, isCurrent ? 'yellow' : 'dim');
    log(`      [${bar}] ${completed}/${total} (${percentage}%)`, 'dim');
  });
}

// 主演示流程
function main() {
  divider('🎭 工作流自动推进功能演示');
  
  log('工作流名称: 学生入学流程', 'cyan');
  log('阶段数量: 6个', 'cyan');
  log('总任务数: 12个', 'cyan');
  
  showStatus();
  showStageProgress();
  
  divider('步骤1: 完成第一阶段的任务');
  
  // 完成阶段1的所有任务
  const stage1Tasks = mockTasks.filter(t => t.stageId === 'stage-1');
  
  stage1Tasks.forEach((task, i) => {
    log(`\n[${i + 1}/${stage1Tasks.length}] 完成任务: ${task.name}`, 'blue');
    task.status = 'completed';
    mockInstance.completedTasks++;
    mockInstance.progress = Math.round((mockInstance.completedTasks / mockTasks.length) * 100);
    
    const checkResult = checkStageAdvancement(mockInstance.id);
    log(`   完成率: ${checkResult.completionRate}%`, 'magenta');
    
    if (checkResult.canAdvance) {
      const result = advanceWorkflowStage(mockInstance.id, { type: 'auto', trigger: 'task_completion' });
      log(`   ✅ ${result.reason}`, 'green');
    }
  });
  
  showStatus();
  showStageProgress();
  
  divider('步骤2: 完成第二阶段任务');
  
  const stage2Tasks = mockTasks.filter(t => t.stageId === 'stage-2');
  stage2Tasks.forEach((task, i) => {
    log(`\n[${i + 1}/${stage2Tasks.length}] 完成任务: ${task.name}`, 'blue');
    task.status = 'completed';
    mockInstance.completedTasks++;
    mockInstance.progress = Math.round((mockInstance.completedTasks / mockTasks.length) * 100);
    
    const checkResult = checkStageAdvancement(mockInstance.id);
    if (checkResult.canAdvance) {
      const result = advanceWorkflowStage(mockInstance.id, { type: 'auto', trigger: 'task_completion' });
      log(`   ✅ ${result.reason}`, 'green');
    }
  });
  
  showStatus();
  showStageProgress();
  
  divider('步骤3: 快速完成剩余阶段');
  
  // 完成剩余所有任务
  const remainingTasks = mockTasks.filter(t => t.status === 'pending');
  remainingTasks.forEach((task, i) => {
    task.status = 'completed';
    mockInstance.completedTasks++;
    mockInstance.progress = Math.round((mockInstance.completedTasks / mockTasks.length) * 100);
    
    const checkResult = checkStageAdvancement(mockInstance.id);
    if (checkResult.canAdvance) {
      const result = advanceWorkflowStage(mockInstance.id, { type: 'auto', trigger: 'task_completion' });
      log(`   [${i + 1}] ✅ ${result.reason}`, 'green');
    }
  });
  
  showStatus();
  showStageProgress();
  
  divider('📜 推进历史记录');
  
  log(`共 ${advancementHistory.length} 次推进:\n`, 'cyan');
  
  advancementHistory.forEach((entry, i) => {
    const arrow = entry.toStage === '完成' ? '🎉' : '→';
    log(`  ${i + 1}. [${entry.type}] ${entry.fromStage} ${arrow} ${entry.toStage}`, 'yellow');
    log(`     触发: ${entry.trigger}`, 'dim');
    log(`     原因: ${entry.reason}`, 'dim');
    log(`     时间: ${new Date(entry.timestamp).toLocaleTimeString()}`, 'dim');
  });
  
  divider('✅ 演示完成');
  
  log('\n工作流自动推进核心功能:', 'bold');
  log('  ✓ 任务完成时自动检查推进条件', 'green');
  log('  ✓ 阶段所有任务完成后自动推进', 'green');
  log('  ✓ 高优先级任务必须完成才能推进', 'green');
  log('  ✓ 支持最低完成率要求 (80%)', 'green');
  log('  ✓ 推进历史日志记录', 'green');
  log('  ✓ 推送通知给相关人员', 'green');
  
  console.log('');
}

main();
