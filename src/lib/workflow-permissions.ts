/**
 * 工作流权限控制服务
 * 实现基于角色的任务操作权限控制
 */

import { type UserRole, hasPermission, ROLE_HIERARCHY } from '@/types/permissions';
import { db } from '@/db';
import { workflowTaskInstances, workflowInstances, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// 重新导出UserRole类型
export type { UserRole } from '@/types/permissions';

// 任务操作类型
export type TaskAction = 
  | 'view'        // 查看任务
  | 'start'       // 开始任务
  | 'complete'    // 完成任务
  | 'skip'        // 跳过任务
  | 'reassign'    // 重新分配
  | 'edit'        // 编辑任务
  | 'add_notes';  // 添加备注

// 操作权限配置
const ACTION_PERMISSIONS: Record<TaskAction, {
  requiredPermission?: string;
  requireAssignee?: boolean;
  allowHigherRole?: boolean;
  description: string;
}> = {
  'view': {
    requiredPermission: 'workflow:read',
    description: '查看任务',
  },
  'start': {
    requiredPermission: 'workflow:manage_tasks',
    requireAssignee: true,
    allowHigherRole: true,
    description: '开始任务',
  },
  'complete': {
    requiredPermission: 'workflow:manage_tasks',
    requireAssignee: true,
    allowHigherRole: true,
    description: '完成任务',
  },
  'skip': {
    requiredPermission: 'workflow:manage_tasks',
    allowHigherRole: true,
    description: '跳过任务',
  },
  'reassign': {
    requiredPermission: 'workflow:manage_tasks',
    description: '重新分配任务',
  },
  'edit': {
    requiredPermission: 'workflow:update',
    description: '编辑任务',
  },
  'add_notes': {
    requiredPermission: 'workflow:manage_tasks',
    requireAssignee: true,
    allowHigherRole: true,
    description: '添加备注',
  },
};

// 权限检查结果
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * 检查用户是否有权限执行任务操作
 */
export async function checkTaskPermission(
  taskId: string,
  userId: string,
  action: TaskAction
): Promise<PermissionCheckResult> {
  try {
    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { allowed: false, reason: '用户不存在' };
    }

    const userRole = user.role as UserRole;
    const actionConfig = ACTION_PERMISSIONS[action];

    // 获取任务信息
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });

    if (!task) {
      return { allowed: false, reason: '任务不存在' };
    }

    // 1. 检查基础权限
    if (actionConfig.requiredPermission) {
      if (!hasPermission(userRole, actionConfig.requiredPermission as any)) {
        return { allowed: false, reason: `没有${actionConfig.description}权限` };
      }
    }

    // 2. 检查是否需要是分配者
    if (actionConfig.requireAssignee) {
      const isAssignee = task.assigneeId === userId;
      
      // 检查角色匹配
      const roleMatches = !task.assigneeRole || task.assigneeRole === userRole;
      
      // 检查是否有更高权限的角色
      const hasHigherRole = actionConfig.allowHigherRole && 
        task.assigneeRole && 
        (ROLE_HIERARCHY[userRole] ?? 0) > (ROLE_HIERARCHY[task.assigneeRole as UserRole] ?? 0);

      if (!isAssignee && !roleMatches && !hasHigherRole) {
        return { allowed: false, reason: '只有任务分配者才能执行此操作' };
      }
    }

    // 3. 检查任务状态是否允许该操作
    const statusCheck = checkTaskStatus(task.status, action);
    if (!statusCheck.allowed) {
      return statusCheck;
    }

    return { allowed: true };
  } catch (error) {
    console.error('检查任务权限失败:', error);
    return { allowed: false, reason: '权限检查失败' };
  }
}

/**
 * 检查任务状态是否允许操作
 */
function checkTaskStatus(taskStatus: string, action: TaskAction): PermissionCheckResult {
  switch (action) {
    case 'start':
      if (taskStatus !== 'pending') {
        return { allowed: false, reason: '只有待处理的任务可以开始' };
      }
      break;
    case 'complete':
      if (taskStatus !== 'in_progress' && taskStatus !== 'pending') {
        return { allowed: false, reason: '只有进行中或待处理的任务可以完成' };
      }
      break;
    case 'skip':
      if (taskStatus === 'completed') {
        return { allowed: false, reason: '已完成的任务不能跳过' };
      }
      break;
    case 'add_notes':
      // 任何状态都可以添加备注
      break;
    case 'edit':
      if (taskStatus === 'completed') {
        return { allowed: false, reason: '已完成的任务不能编辑' };
      }
      break;
  }
  return { allowed: true };
}

/**
 * 获取用户可操作的任务列表
 */
export async function getAccessibleTasks(
  instanceId: string,
  userId: string
): Promise<{
  all: string[];
  assigned: string[];
  byRole: string[];
  manageable: string[];
}> {
  try {
    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { all: [], assigned: [], byRole: [], manageable: [] };
    }

    const userRole = user.role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

    // 获取所有任务
    const tasks = await db.select()
      .from(workflowTaskInstances)
      .where(eq(workflowTaskInstances.instanceId, instanceId));

    const result = {
      all: tasks.map(t => t.id),
      assigned: [] as string[],
      byRole: [] as string[],
      manageable: [] as string[],
    };

    for (const task of tasks) {
      // 分配给当前用户的任务
      if (task.assigneeId === userId) {
        result.assigned.push(task.id);
      }

      // 角色匹配的任务
      if (!task.assigneeRole || task.assigneeRole === userRole) {
        result.byRole.push(task.id);
      }

      // 可以管理的任务（更高权限或匹配角色）
      const taskRoleLevel = task.assigneeRole 
        ? (ROLE_HIERARCHY[task.assigneeRole as UserRole] ?? 0) 
        : 0;
      
      if (userLevel >= taskRoleLevel) {
        result.manageable.push(task.id);
      }
    }

    return result;
  } catch (error) {
    console.error('获取可操作任务失败:', error);
    return { all: [], assigned: [], byRole: [], manageable: [] };
  }
}

/**
 * 批量检查任务权限
 */
export async function batchCheckPermissions(
  taskIds: string[],
  userId: string,
  action: TaskAction
): Promise<Record<string, PermissionCheckResult>> {
  const results: Record<string, PermissionCheckResult> = {};
  
  for (const taskId of taskIds) {
    results[taskId] = await checkTaskPermission(taskId, userId, action);
  }
  
  return results;
}

/**
 * 检查用户任务权限（简化版本，直接传入用户角色）
 */
export async function checkUserTaskPermission(
  userId: string,
  userRole: UserRole,
  taskId: string,
  action: TaskAction = 'complete'
): Promise<boolean> {
  try {
    const actionConfig = ACTION_PERMISSIONS[action];

    // 获取任务信息
    const task = await db.query.workflowTaskInstances.findFirst({
      where: eq(workflowTaskInstances.id, taskId),
    });

    if (!task) {
      return false;
    }

    // 1. 检查基础权限
    if (actionConfig.requiredPermission) {
      if (!hasPermission(userRole, actionConfig.requiredPermission as any)) {
        return false;
      }
    }

    // 2. 检查是否需要是分配者
    if (actionConfig.requireAssignee) {
      const isAssignee = task.assigneeId === userId;
      
      // 检查角色匹配
      const roleMatches = !task.assigneeRole || task.assigneeRole === userRole;
      
      // 检查是否有更高权限的角色
      const hasHigherRole = actionConfig.allowHigherRole && 
        task.assigneeRole && 
        (ROLE_HIERARCHY[userRole] ?? 0) > (ROLE_HIERARCHY[task.assigneeRole as UserRole] ?? 0);

      if (!isAssignee && !roleMatches && !hasHigherRole) {
        return false;
      }
    }

    // 3. 检查任务状态是否允许该操作
    const statusCheck = checkTaskStatus(task.status, action);
    if (!statusCheck.allowed) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('检查任务权限失败:', error);
    return false;
  }
}

/**
 * 获取任务操作权限摘要
 */
export async function getTaskActionSummary(
  taskId: string,
  userId: string
): Promise<Record<TaskAction, boolean>> {
  const summary: Record<TaskAction, boolean> = {
    view: false,
    start: false,
    complete: false,
    skip: false,
    reassign: false,
    edit: false,
    add_notes: false,
  };

  for (const action of Object.keys(summary) as TaskAction[]) {
    const result = await checkTaskPermission(taskId, userId, action);
    summary[action] = result.allowed;
  }

  return summary;
}
