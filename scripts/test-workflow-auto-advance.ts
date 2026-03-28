/**
 * 工作流自动推进测试脚本
 * 演示完整的工作流推进流程
 */

import { db } from '../src/db/index';
import { 
  workflowDefinitions,
  workflowStageDefinitions,
  workflowTaskTemplates,
  workflowInstances,
  workflowTaskInstances,
  students,
} from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  checkStageAdvancement,
  advanceWorkflowStage,
  onTaskCompleted,
  getAdvancementHistory,
} from '../src/lib/workflow-auto-advance';

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: string = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function divider(title: string = '') {
  console.log('\n' + '='.repeat(60));
  if (title) {
    console.log(`  ${title}`);
    console.log('='.repeat(60));
  }
}

async function main() {
  divider('工作流自动推进测试');

  try {
    // 1. 检查工作流定义
    divider('步骤1: 检查工作流定义');
    
    const definitions = await db.select().from(workflowDefinitions);
    log(`找到 ${definitions.length} 个工作流定义`, 'cyan');
    
    if (definitions.length === 0) {
      log('没有找到工作流定义，请先初始化工作流', 'red');
      return;
    }

    const studentOnboardingDef = definitions.find(d => d.type === 'student_onboarding');
    if (!studentOnboardingDef) {
      log('没有找到学生入学流程定义', 'red');
      return;
    }
    log(`使用工作流: ${studentOnboardingDef.name}`, 'green');

    // 2. 获取阶段定义
    divider('步骤2: 获取阶段定义');
    
    const stages = await db.select()
      .from(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.workflowId, studentOnboardingDef.id))
      .orderBy(workflowStageDefinitions.stageOrder);

    log(`工作流有 ${stages.length} 个阶段:`, 'cyan');
    stages.forEach((stage, index) => {
      log(`  ${index + 1}. ${stage.name} (${stage.color})`, 'yellow');
    });

    if (stages.length === 0) {
      log('没有找到阶段定义', 'red');
      return;
    }

    // 3. 创建测试学生和工作流实例
    divider('步骤3: 创建测试数据');
    
    // 创建测试学生
    const testStudentId = uuidv4();
    const testStudent = await db.insert(students).values({
      id: testStudentId,
      studentId: `TEST${Date.now()}`,
      name: '测试学生_' + Date.now(),
      major: '游戏策划',
      applicationCountry: '美国',
      currentStage: '咨询阶段',
      totalHours: 100,
      consumedHours: 0,
      remainingHours: 100,
      studentStatus: '在读',
    }).returning();

    log(`创建测试学生: ${testStudent[0].name}`, 'green');

    // 创建工作流实例
    const instanceId = uuidv4();
    const firstStage = stages[0];
    
    await db.insert(workflowInstances).values({
      id: instanceId,
      workflowId: studentOnboardingDef.id,
      entityType: 'student',
      entityId: testStudentId,
      currentStageId: firstStage.id,
      status: 'pending',
      progress: 0,
      totalTasks: 0,
      completedTasks: 0,
    });

    log(`创建工作流实例: ${instanceId}`, 'green');

    // 手动创建第一阶段的任务（跳过模板查询）
    const firstStageTaskNames = [
      '录入学生基本信息',
      '确认缴费信息',
      '分配规划顾问',
    ];

    let taskCount = 0;
    for (let i = 0; i < firstStageTaskNames.length; i++) {
      await db.insert(workflowTaskInstances).values({
        id: uuidv4(),
        instanceId,
        stageId: firstStage.id,
        name: firstStageTaskNames[i],
        description: `任务描述: ${firstStageTaskNames[i]}`,
        priority: i === 0 ? 'high' : 'medium',
        assigneeRole: '规划顾问',
        status: 'pending',
        checklist: [],
        totalChecklist: 0,
        completedChecklist: 0,
        blockedByDependencies: false,
      });
      taskCount++;
    }

    // 为后续阶段也创建任务
    for (let s = 1; s < stages.length; s++) {
      const stage = stages[s];
      const taskNames = [
        `${stage.name}任务1`,
        `${stage.name}任务2`,
      ];
      
      for (let i = 0; i < taskNames.length; i++) {
        await db.insert(workflowTaskInstances).values({
          id: uuidv4(),
          instanceId,
          stageId: stage.id,
          name: taskNames[i],
          description: `任务描述: ${taskNames[i]}`,
          priority: 'medium',
          assigneeRole: '全职导师',
          status: 'pending',
          checklist: [],
          totalChecklist: 0,
          completedChecklist: 0,
          blockedByDependencies: false,
        });
        taskCount++;
      }
    }

    // 更新总任务数
    await db.update(workflowInstances)
      .set({ totalTasks: taskCount })
      .where(eq(workflowInstances.id, instanceId));

    log(`创建了 ${taskCount} 个任务实例`, 'green');

    // 4. 获取第一阶段任务
    divider('步骤4: 第一阶段任务状态');
    
    const firstStageTasks = await db.select()
      .from(workflowTaskInstances)
      .where(and(
        eq(workflowTaskInstances.instanceId, instanceId),
        eq(workflowTaskInstances.stageId, firstStage.id)
      ));

    log(`第一阶段 "${firstStage.name}" 有 ${firstStageTasks.length} 个任务:`, 'cyan');
    firstStageTasks.forEach((task, index) => {
      log(`  ${index + 1}. [${task.priority}] ${task.name} - ${task.status}`, 'yellow');
    });

    // 5. 检查初始推进状态
    divider('步骤5: 检查初始推进状态');
    
    const initialCheck = await checkStageAdvancement(instanceId);
    log(`推进检查结果:`, 'cyan');
    log(`  可推进: ${initialCheck.canAdvance ? '是' : '否'}`, initialCheck.canAdvance ? 'green' : 'red');
    log(`  原因: ${initialCheck.reason}`, 'yellow');
    log(`  完成率: ${initialCheck.completionRate}%`, 'magenta');

    // 6. 模拟完成第一阶段的所有任务
    divider('步骤6: 模拟完成任务');
    
    for (let i = 0; i < firstStageTasks.length; i++) {
      const task = firstStageTasks[i];
      log(`\n完成任务 ${i + 1}/${firstStageTasks.length}: ${task.name}`, 'blue');
      
      // 更新任务状态
      await db.update(workflowTaskInstances)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflowTaskInstances.id, task.id));

      // 触发推进检查
      const advancementResult = await onTaskCompleted(task.id, 'test-user');

      if (advancementResult) {
        log(`  ✅ 工作流已自动推进!`, 'green');
        log(`  ${advancementResult.previousStageName} -> ${advancementResult.newStageName}`, 'cyan');
        log(`  原因: ${advancementResult.reason}`, 'yellow');
        break; // 推进后跳出循环
      } else {
        log(`  任务已完成，但未满足推进条件`, 'yellow');
        
        // 检查当前状态
        const currentCheck = await checkStageAdvancement(instanceId);
        log(`  当前完成率: ${currentCheck.completionRate}%`, 'magenta');
      }
    }

    // 7. 查看推进后的状态
    divider('步骤7: 推进后的工作流状态');
    
    const updatedInstance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });

    if (updatedInstance) {
      log(`工作流状态: ${updatedInstance.status}`, 'cyan');
      log(`进度: ${updatedInstance.progress}%`, 'cyan');
      log(`已完成任务: ${updatedInstance.completedTasks}/${updatedInstance.totalTasks}`, 'cyan');
      
      const currentStage = stages.find(s => s.id === updatedInstance.currentStageId);
      log(`当前阶段: ${currentStage?.name || '未知'}`, 'green');
    }

    // 8. 查看推进历史
    divider('步骤8: 推进历史记录');
    
    const history = await getAdvancementHistory(instanceId);
    log(`共 ${history.length} 条推进记录:`, 'cyan');
    
    for (const record of history) {
      const fromStage = stages.find(s => s.id === record.fromStageId);
      const toStage = stages.find(s => s.id === record.toStageId);
      log(`  [${record.advancementType}] ${fromStage?.name || '开始'} -> ${toStage?.name || '完成'}`, 'yellow');
      log(`    触发: ${record.trigger}`, 'magenta');
      log(`    原因: ${record.reason}`, 'magenta');
      log(`    时间: ${record.createdAt?.toLocaleString()}`, 'magenta');
    }

    // 9. 继续推进演示
    divider('步骤9: 继续推进演示');
    
    // 获取当前阶段的任务
    const currentStageId = updatedInstance?.currentStageId;
    if (currentStageId) {
      const currentTasks = await db.select()
        .from(workflowTaskInstances)
        .where(and(
          eq(workflowTaskInstances.instanceId, instanceId),
          eq(workflowTaskInstances.stageId, currentStageId)
        ));

      log(`当前阶段有 ${currentTasks.length} 个任务`, 'cyan');
      log(`完成所有任务以继续推进...`, 'yellow');

      // 完成当前阶段所有任务
      for (const task of currentTasks) {
        await db.update(workflowTaskInstances)
          .set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workflowTaskInstances.id, task.id));
        
        log(`  完成任务: ${task.name}`, 'green');
        
        const result = await onTaskCompleted(task.id, 'test-user');
        if (result) {
          log(`  ✅ 工作流推进: ${result.previousStageName} -> ${result.newStageName}`, 'green');
        }
      }
    }

    // 10. 最终状态
    divider('步骤10: 最终工作流状态');
    
    const finalInstance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });

    if (finalInstance) {
      log(`状态: ${finalInstance.status}`, finalInstance.status === 'completed' ? 'green' : 'yellow');
      log(`进度: ${finalInstance.progress}%`, 'cyan');
      log(`已完成任务: ${finalInstance.completedTasks}/${finalInstance.totalTasks}`, 'cyan');
      
      const finalStage = stages.find(s => s.id === finalInstance.currentStageId);
      log(`当前阶段: ${finalStage?.name || '已完成'}`, 'cyan');
    }

    // 最终推进历史
    const finalHistory = await getAdvancementHistory(instanceId);
    log(`\n推进历史 (${finalHistory.length} 次):`, 'cyan');
    finalHistory.forEach((record, index) => {
      const fromStage = stages.find(s => s.id === record.fromStageId);
      const toStage = stages.find(s => s.id === record.toStageId);
      log(`  ${index + 1}. ${fromStage?.name || '开始'} → ${toStage?.name || '完成'} (${record.advancementType})`, 'green');
    });

    // 清理测试数据
    divider('清理测试数据');
    await db.delete(workflowInstances).where(eq(workflowInstances.id, instanceId));
    await db.delete(students).where(eq(students.id, testStudentId));
    log('测试数据已清理', 'green');

    divider('测试完成');
    log('✅ 工作流自动推进功能测试成功!', 'green');

  } catch (error) {
    log(`\n❌ 错误: ${error}`, 'red');
    console.error(error);
  }

  process.exit(0);
}

main();
