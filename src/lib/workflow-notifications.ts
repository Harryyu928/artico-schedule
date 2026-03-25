/**
 * 工作流通知服务
 * 实现任务到期/超时提醒
 */

import { db } from '@/db';
import { 
  workflowTaskInstances, 
  workflowInstances,
  workflowStageDefinitions,
  users,
  students,
} from '@/db/schema';
import { eq, and, lte, gte, isNotNull, isNull } from 'drizzle-orm';
import { sendNotification, type NotificationChannel, type NotificationPayload } from './notification-service';

// 提醒类型
export type ReminderType = 
  | 'task_due_soon'      // 任务即将到期
  | 'task_overdue'       // 任务已超时
  | 'stage_advance'      // 阶段推进
  | 'workflow_complete'  // 工作流完成
  | 'task_assigned';     // 任务分配

// 提醒配置
export interface ReminderConfig {
  // 到期前提醒时间（小时）
  dueSoonHours: number[];
  // 超时后提醒间隔（小时）
  overdueIntervalHours: number;
  // 最大超时提醒次数
  maxOverdueReminders: number;
}

// 默认提醒配置
const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  dueSoonHours: [24, 4, 1], // 提前24小时、4小时、1小时提醒
  overdueIntervalHours: 24, // 超时后每24小时提醒一次
  maxOverdueReminders: 3,   // 最多提醒3次
};

/**
 * 检查并发送任务到期提醒
 */
export async function checkAndSendDueReminders(
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG
): Promise<{
  dueSoonSent: number;
  overdueSent: number;
  errors: string[];
}> {
  const result = {
    dueSoonSent: 0,
    overdueSent: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();
    
    // 1. 检查即将到期的任务
    for (const hours of config.dueSoonHours) {
      const dueThreshold = new Date(now.getTime() + hours * 60 * 60 * 1000);
      
      // 查找即将到期但未完成的任务
      const tasksDueSoon = await db.select({
        task: workflowTaskInstances,
        instance: workflowInstances,
      })
        .from(workflowTaskInstances)
        .leftJoin(workflowInstances, eq(workflowTaskInstances.instanceId, workflowInstances.id))
        .where(and(
          eq(workflowTaskInstances.status, 'pending'),
          isNotNull(workflowTaskInstances.dueDate),
          lte(workflowTaskInstances.dueDate, dueThreshold.toISOString().split('T')[0]),
          gte(workflowTaskInstances.dueDate, now.toISOString().split('T')[0])
        ));

      for (const { task, instance } of tasksDueSoon) {
        try {
          // 检查是否已发送过此时间段的提醒
          const reminderKey = `due_soon_${hours}h`;
          const lastReminder = await getLastReminderTime(task.id, reminderKey);
          
          if (!lastReminder || (now.getTime() - lastReminder.getTime()) > hours * 60 * 60 * 1000) {
            await sendTaskReminder({
              type: 'task_due_soon',
              task,
              instance,
              hoursRemaining: hours,
            });
            
            await recordReminderSent(task.id, reminderKey);
            result.dueSoonSent++;
          }
        } catch (error) {
          result.errors.push(`发送到期提醒失败: ${task.name} - ${(error as Error).message}`);
        }
      }
    }

    // 2. 检查已超时的任务
    const overdueTasks = await db.select({
      task: workflowTaskInstances,
      instance: workflowInstances,
    })
      .from(workflowTaskInstances)
      .leftJoin(workflowInstances, eq(workflowTaskInstances.instanceId, workflowInstances.id))
      .where(and(
        eq(workflowTaskInstances.status, 'pending'),
        isNotNull(workflowTaskInstances.dueDate),
        lte(workflowTaskInstances.dueDate, now.toISOString().split('T')[0])
      ));

    for (const { task, instance } of overdueTasks) {
      try {
        const reminderKey = 'overdue';
        const reminderCount = await getReminderCount(task.id, reminderKey);
        
        if (reminderCount < config.maxOverdueReminders) {
          const lastReminder = await getLastReminderTime(task.id, reminderKey);
          
          if (!lastReminder || 
              (now.getTime() - lastReminder.getTime()) > config.overdueIntervalHours * 60 * 60 * 1000) {
            await sendTaskReminder({
              type: 'task_overdue',
              task,
              instance,
              overdueDays: Math.floor((now.getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
            });
            
            await recordReminderSent(task.id, reminderKey);
            result.overdueSent++;
          }
        }
      } catch (error) {
        result.errors.push(`发送超时提醒失败: ${task.name} - ${(error as Error).message}`);
      }
    }
  } catch (error) {
    result.errors.push(`检查提醒失败: ${(error as Error).message}`);
  }

  return result;
}

/**
 * 发送任务提醒
 */
async function sendTaskReminder(params: {
  type: ReminderType;
  task: typeof workflowTaskInstances.$inferSelect;
  instance: typeof workflowInstances.$inferSelect | null;
  hoursRemaining?: number;
  overdueDays?: number;
}): Promise<void> {
  const { type, task, instance, hoursRemaining, overdueDays } = params;

  // 获取分配者信息
  let assigneeId = task.assigneeId;
  let assigneeName = '用户';
  
  if (assigneeId) {
    const assignee = await db.query.users.findFirst({
      where: eq(users.id, assigneeId),
    });
    if (assignee) {
      assigneeName = assignee.name;
    }
  }

  // 构建通知内容
  let title = '';
  let content = '';
  
  switch (type) {
    case 'task_due_soon':
      title = `任务即将到期: ${task.name}`;
      content = `您好 ${assigneeName}，您有一个任务即将在 ${hoursRemaining} 小时内到期。\n\n任务：${task.name}\n截止日期：${task.dueDate}\n\n请及时处理。`;
      break;
    case 'task_overdue':
      title = `任务已超时: ${task.name}`;
      content = `您好 ${assigneeName}，您有一个任务已超时 ${overdueDays} 天。\n\n任务：${task.name}\n截止日期：${task.dueDate}\n\n请尽快处理。`;
      break;
    default:
      return;
  }

  // 发送通知
  if (assigneeId) {
    const payload: NotificationPayload = {
      type: 'deadline_reminder',
      title,
      content,
      data: {
        taskId: task.id,
        taskName: task.name,
        instanceId: instance?.id,
        reminderType: type,
      },
    };
    
    await sendNotification(assigneeId, payload, {
      userType: 'teacher',
      role: task.assigneeRole as any,
    });
  }

  console.log(`[Reminder] Sent ${type} for task ${task.name} to ${assigneeName}`);
}

/**
 * 获取最后提醒时间
 */
async function getLastReminderTime(taskId: string, reminderType: string): Promise<Date | null> {
  // 这里可以使用Redis或其他存储来记录提醒时间
  // 简化实现：使用数据库中的notes字段
  try {
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });
    
    if (task?.notes) {
      const notes = JSON.parse(task.notes);
      return notes._reminders?.[reminderType]?.lastSent 
        ? new Date(notes._reminders[reminderType].lastSent)
        : null;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * 获取提醒次数
 */
async function getReminderCount(taskId: string, reminderType: string): Promise<number> {
  try {
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });
    
    if (task?.notes) {
      const notes = JSON.parse(task.notes);
      return notes._reminders?.[reminderType]?.count || 0;
    }
    
    return 0;
  } catch {
    return 0;
  }
}

/**
 * 记录提醒已发送
 */
async function recordReminderSent(taskId: string, reminderType: string): Promise<void> {
  try {
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });
    
    const notes = task?.notes ? JSON.parse(task.notes) : {};
    if (!notes._reminders) {
      notes._reminders = {};
    }
    if (!notes._reminders[reminderType]) {
      notes._reminders[reminderType] = { count: 0, lastSent: null };
    }
    
    notes._reminders[reminderType].count++;
    notes._reminders[reminderType].lastSent = new Date().toISOString();
    
    await db.update(workflowTaskInstances)
      .set({ notes: JSON.stringify(notes), updatedAt: new Date() })
      .where(eq(workflowTaskInstances.id, taskId));
  } catch (error) {
    console.error('记录提醒失败:', error);
  }
}

/**
 * 发送阶段推进通知
 */
export async function sendStageAdvanceNotification(
  instanceId: string,
  previousStageName: string,
  newStageName: string
): Promise<void> {
  try {
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });
    
    if (!instance) return;

    // 获取实体名称
    let entityName = instance.entityId;
    if (instance.entityType === 'student') {
      const student = await db.query.students.findFirst({
        where: eq(students.id, instance.entityId),
      });
      if (student) {
        entityName = student.name;
      }
    }

    // 获取当前阶段的任务分配者
    const tasks = await db.select()
      .from(workflowTaskInstances)
      .where(and(
        eq(workflowTaskInstances.instanceId, instanceId),
        eq(workflowTaskInstances.status, 'pending')
      ));

    const assigneeIds = [...new Set(tasks.filter(t => t.assigneeId).map(t => t.assigneeId))];
    
    for (const assigneeId of assigneeIds) {
      if (assigneeId) {
        const payload: NotificationPayload = {
          type: 'progress_update',
          title: `工作流阶段推进: ${entityName}`,
          content: `工作流已从"${previousStageName}"推进到"${newStageName}"。\n\n您有新的待处理任务，请及时查看。`,
          data: {
            instanceId,
            previousStage: previousStageName,
            newStage: newStageName,
          },
        };
        
        await sendNotification(assigneeId, payload, {
          userType: 'teacher',
        });
      }
    }

    console.log(`[Notification] Stage advance: ${previousStageName} -> ${newStageName}`);
  } catch (error) {
    console.error('发送阶段推进通知失败:', error);
  }
}

/**
 * 发送工作流完成通知
 */
export async function sendWorkflowCompleteNotification(instanceId: string): Promise<void> {
  try {
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });
    
    if (!instance) return;

    // 获取创建者或相关负责人
    // 简化实现：发送给所有参与过任务的用户
    const tasks = await db.select()
      .from(workflowTaskInstances)
      .where(eq(workflowTaskInstances.instanceId, instanceId));

    const participantIds = [...new Set(tasks.filter(t => t.assigneeId).map(t => t.assigneeId))];
    
    for (const participantId of participantIds) {
      if (participantId) {
        const payload: NotificationPayload = {
          type: 'progress_update',
          title: `工作流已完成: ${instance.entityType}`,
          content: `工作流已完成！所有任务均已处理完毕。`,
          data: {
            instanceId,
          },
        };
        
        await sendNotification(participantId, payload, {
          userType: 'teacher',
        });
      }
    }

    console.log(`[Notification] Workflow completed: ${instanceId}`);
  } catch (error) {
    console.error('发送工作流完成通知失败:', error);
  }
}
