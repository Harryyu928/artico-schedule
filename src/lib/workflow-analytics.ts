/**
 * 工作流数据分析服务
 * 实现工作流效率报表和统计
 */

import { db } from '@/db';
import { 
  workflowDefinitions,
  workflowStageDefinitions,
  workflowInstances,
  workflowTaskInstances,
  users,
  students,
} from '@/db/schema';
import { eq, and, gte, lte, sql, isNotNull } from 'drizzle-orm';

// 时间范围类型
export type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

// 工作流统计概览
export interface WorkflowOverview {
  // 实例统计
  totalInstances: number;
  activeInstances: number;
  completedInstances: number;
  overdueInstances: number;
  
  // 任务统计
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  
  // 效率指标
  averageCompletionTime: number; // 平均完成时间（小时）
  onTimeCompletionRate: number;  // 按时完成率
  averageTasksPerInstance: number;
}

// 阶段统计
export interface StageStats {
  stageId: string;
  stageName: string;
  order: number;
  
  // 统计数据
  totalInstances: number;
  completedInstances: number;
  averageDuration: number; // 平均停留时间（小时）
  bottleneck: boolean; // 是否是瓶颈阶段
}

// 任务统计
export interface TaskStats {
  taskId: string;
  taskName: string;
  role: string;
  
  // 统计数据
  totalAssigned: number;
  completed: number;
  overdue: number;
  averageCompletionTime: number;
  onTimeRate: number;
}

// 用户工作负载统计
export interface UserWorkload {
  userId: string;
  userName: string;
  role: string;
  
  // 当前负载
  pendingTasks: number;
  overdueTasks: number;
  
  // 完成情况
  completedThisWeek: number;
  completedThisMonth: number;
  
  // 效率
  averageCompletionTime: number;
  onTimeRate: number;
}

// 工作流效率报表
export interface WorkflowEfficiencyReport {
  overview: WorkflowOverview;
  stageStats: StageStats[];
  taskStats: TaskStats[];
  userWorkload: UserWorkload[];
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
}

/**
 * 获取时间范围
 */
function getTimeRange(range: TimeRange): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      // 默认本月
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
  }
  
  return { start, end: now };
}

/**
 * 生成工作流效率报表
 */
export async function generateEfficiencyReport(
  timeRange: TimeRange = 'month'
): Promise<WorkflowEfficiencyReport> {
  const { start, end } = getTimeRange(timeRange);
  
  // 1. 获取概览统计
  const overview = await getOverviewStats(start, end);
  
  // 2. 获取阶段统计
  const stageStats = await getStageStats(start, end);
  
  // 3. 获取任务统计
  const taskStats = await getTaskStats(start, end);
  
  // 4. 获取用户工作负载
  const userWorkload = await getUserWorkload(start, end);
  
  return {
    overview,
    stageStats,
    taskStats,
    userWorkload,
    generatedAt: new Date(),
    timeRange: { start, end },
  };
}

/**
 * 获取概览统计
 */
async function getOverviewStats(start: Date, end: Date): Promise<WorkflowOverview> {
  // 实例统计
  const instances = await db.select()
    .from(workflowInstances);
  
  // 过滤时间范围内的实例
  const filteredInstances = instances.filter(i => {
    const createdAt = new Date(i.createdAt);
    return createdAt >= start && createdAt <= end;
  });
  
  const totalInstances = filteredInstances.length;
  const activeInstances = filteredInstances.filter(i => i.status === 'in_progress').length;
  const completedInstances = filteredInstances.filter(i => i.status === 'completed').length;
  const overdueInstances = filteredInstances.filter(i => i.status === 'blocked').length;
  
  // 任务统计
  const tasks = await db.select()
    .from(workflowTaskInstances);
  
  const filteredTasks = tasks.filter(t => {
    const createdAt = new Date(t.createdAt);
    return createdAt >= start && createdAt <= end;
  });
  
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
  const pendingTasks = filteredTasks.filter(t => t.status === 'pending').length;
  
  // 计算超时任务
  const now = new Date();
  const overdueTasks = filteredTasks.filter(t => 
    t.status === 'pending' && 
    t.dueDate && 
    new Date(t.dueDate) < now
  ).length;
  
  // 计算平均完成时间
  const completedTasksWithDuration = filteredTasks.filter(t => 
    t.status === 'completed' && 
    t.completedAt && 
    t.createdAt
  );
  
  let averageCompletionTime = 0;
  if (completedTasksWithDuration.length > 0) {
    const totalDuration = completedTasksWithDuration.reduce((sum, t) => {
      const duration = new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime();
      return sum + duration;
    }, 0);
    averageCompletionTime = totalDuration / completedTasksWithDuration.length / (1000 * 60 * 60); // 转换为小时
  }
  
  // 计算按时完成率
  const onTimeTasks = completedTasksWithDuration.filter(t => 
    t.dueDate && new Date(t.completedAt!) <= new Date(t.dueDate)
  );
  const onTimeCompletionRate = completedTasksWithDuration.length > 0 
    ? (onTimeTasks.length / completedTasksWithDuration.length) * 100 
    : 100;
  
  // 平均任务数
  const averageTasksPerInstance = totalInstances > 0 ? totalTasks / totalInstances : 0;
  
  return {
    totalInstances,
    activeInstances,
    completedInstances,
    overdueInstances,
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    averageCompletionTime,
    onTimeCompletionRate,
    averageTasksPerInstance,
  };
}

/**
 * 获取阶段统计
 */
async function getStageStats(start: Date, end: Date): Promise<StageStats[]> {
  // 获取所有阶段定义
  const stages = await db.select()
    .from(workflowStageDefinitions)
    .orderBy(workflowStageDefinitions.stageOrder);
  
  const stats: StageStats[] = [];
  
  // 获取所有任务
  const tasks = await db.select()
    .from(workflowTaskInstances);
  
  // 按阶段分组
  for (const stage of stages) {
    const stageTasks = tasks.filter(t => t.stageId === stage.id);
    const completedCount = stageTasks.filter(t => t.status === 'completed').length;
    
    // 计算平均完成时间
    const completedTasksWithDuration = stageTasks.filter(t => 
      t.status === 'completed' && 
      t.completedAt && 
      t.createdAt
    );
    
    let averageDuration = 0;
    if (completedTasksWithDuration.length > 0) {
      const totalDuration = completedTasksWithDuration.reduce((sum, t) => {
        const duration = new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime();
        return sum + duration;
      }, 0);
      averageDuration = totalDuration / completedTasksWithDuration.length / (1000 * 60 * 60);
    }
    
    stats.push({
      stageId: stage.id,
      stageName: stage.name,
      order: stage.stageOrder,
      totalInstances: stageTasks.length,
      completedInstances: completedCount,
      averageDuration,
      bottleneck: false,
    });
  }
  
  // 计算瓶颈阶段（平均停留时间最长的前20%）
  const avgDurations = stats.map(s => s.averageDuration).filter(d => d > 0);
  if (avgDurations.length > 0) {
    const sortedDurations = [...avgDurations].sort((a, b) => b - a);
    const threshold = sortedDurations[Math.floor(sortedDurations.length * 0.2)] || 0;
    stats.forEach(s => {
      s.bottleneck = s.averageDuration >= threshold && s.averageDuration > 0;
    });
  }
  
  return stats;
}

/**
 * 获取任务统计
 */
async function getTaskStats(start: Date, end: Date): Promise<TaskStats[]> {
  const tasks = await db.select()
    .from(workflowTaskInstances);
  
  // 过滤时间范围
  const filteredTasks = tasks.filter(t => {
    const createdAt = new Date(t.createdAt);
    return createdAt >= start && createdAt <= end;
  });
  
  // 按任务名称分组
  const taskMap = new Map<string, {
    name: string;
    role: string;
    total: number;
    completed: number;
    overdue: number;
    durations: number[];
    onTime: number;
  }>();
  
  const now = new Date();
  
  for (const task of filteredTasks) {
    const key = `${task.name}_${task.assigneeRole}`;
    
    if (!taskMap.has(key)) {
      taskMap.set(key, {
        name: task.name,
        role: task.assigneeRole || 'unknown',
        total: 0,
        completed: 0,
        overdue: 0,
        durations: [],
        onTime: 0,
      });
    }
    
    const stats = taskMap.get(key)!;
    stats.total++;
    
    if (task.status === 'completed') {
      stats.completed++;
      
      if (task.completedAt && task.createdAt) {
        const duration = (new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
        stats.durations.push(duration);
        
        if (task.dueDate && new Date(task.completedAt) <= new Date(task.dueDate)) {
          stats.onTime++;
        }
      }
    } else if (task.status === 'pending' && task.dueDate && new Date(task.dueDate) < now) {
      stats.overdue++;
    }
  }
  
  // 转换为数组
  const result: TaskStats[] = [];
  
  for (const [key, stats] of taskMap) {
    const avgTime = stats.durations.length > 0 
      ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length 
      : 0;
    
    const onTimeRate = stats.completed > 0 
      ? (stats.onTime / stats.completed) * 100 
      : 100;
    
    result.push({
      taskId: key,
      taskName: stats.name,
      role: stats.role,
      totalAssigned: stats.total,
      completed: stats.completed,
      overdue: stats.overdue,
      averageCompletionTime: avgTime,
      onTimeRate,
    });
  }
  
  // 按完成率排序
  result.sort((a, b) => {
    const rateA = a.completed / a.totalAssigned;
    const rateB = b.completed / b.totalAssigned;
    return rateA - rateB;
  });
  
  return result.slice(0, 20);
}

/**
 * 获取用户工作负载
 */
async function getUserWorkload(start: Date, end: Date): Promise<UserWorkload[]> {
  // 获取所有有任务的用户
  const tasks = await db.select()
    .from(workflowTaskInstances)
    .where(isNotNull(workflowTaskInstances.assigneeId));
  
  // 按用户分组
  const userMap = new Map<string, {
    pending: number;
    overdue: number;
    completedThisWeek: number;
    completedThisMonth: number;
    durations: number[];
    onTime: number;
    completed: number;
  }>();
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  for (const task of tasks) {
    if (!task.assigneeId) continue;
    
    if (!userMap.has(task.assigneeId)) {
      userMap.set(task.assigneeId, {
        pending: 0,
        overdue: 0,
        completedThisWeek: 0,
        completedThisMonth: 0,
        durations: [],
        onTime: 0,
        completed: 0,
      });
    }
    
    const stats = userMap.get(task.assigneeId)!;
    
    if (task.status === 'pending') {
      stats.pending++;
      
      if (task.dueDate && new Date(task.dueDate) < now) {
        stats.overdue++;
      }
    } else if (task.status === 'completed') {
      stats.completed++;
      
      if (task.completedAt && task.createdAt) {
        const duration = (new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
        stats.durations.push(duration);
        
        if (task.dueDate && new Date(task.completedAt) <= new Date(task.dueDate)) {
          stats.onTime++;
        }
      }
      
      if (task.completedAt && new Date(task.completedAt) >= weekAgo) {
        stats.completedThisWeek++;
      }
      
      if (task.completedAt && new Date(task.completedAt) >= monthAgo) {
        stats.completedThisMonth++;
      }
    }
  }
  
  // 获取用户信息
  const result: UserWorkload[] = [];
  
  for (const [userId, stats] of userMap) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (user) {
      const avgTime = stats.durations.length > 0 
        ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length 
        : 0;
      
      const onTimeRate = stats.completed > 0 
        ? (stats.onTime / stats.completed) * 100 
        : 100;
      
      result.push({
        userId,
        userName: user.name,
        role: user.role,
        pendingTasks: stats.pending,
        overdueTasks: stats.overdue,
        completedThisWeek: stats.completedThisWeek,
        completedThisMonth: stats.completedThisMonth,
        averageCompletionTime: avgTime,
        onTimeRate,
      });
    }
  }
  
  // 按待处理任务数排序
  result.sort((a, b) => b.pendingTasks - a.pendingTasks);
  
  return result;
}

/**
 * 获取工作流趋势数据
 */
export async function getWorkflowTrends(
  days: number = 30
): Promise<{
  date: string;
  created: number;
  completed: number;
}[]> {
  const result: { date: string; created: number; completed: number }[] = [];
  
  const instances = await db.select()
    .from(workflowInstances);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // 统计当天创建的实例
    const createdCount = instances.filter(i => {
      const createdAt = new Date(i.createdAt);
      return createdAt >= startOfDay && createdAt <= endOfDay;
    }).length;
    
    // 统计当天完成的实例
    const completedCount = instances.filter(i => {
      if (i.status !== 'completed' || !i.completedAt) return false;
      const completedAt = new Date(i.completedAt);
      return completedAt >= startOfDay && completedAt <= endOfDay;
    }).length;
    
    result.push({
      date: dateStr,
      created: createdCount,
      completed: completedCount,
    });
  }
  
  return result;
}
