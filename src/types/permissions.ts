/**
 * 权限系统类型定义
 * 
 * 角色层级：
 * - 管理员: 系统管理员（最高权限，即顾问主管）
 * - 规划顾问: 负责学生选课指导
 * - 全职导师: 核心课程导师
 * - 兼职导师: 辅助课程导师
 */

// 用户角色枚举（与数据库枚举保持一致）
export type UserRole = 
  | '管理员'      // 顾问主管
  | '规划顾问'
  | '全职导师'
  | '兼职导师'
  | '学生';

// 权限定义
export type Permission = 
  // 系统管理
  | 'system:manage'
  | 'system:view_logs'
  
  // 用户管理
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:manage_role'
  
  // 学生管理
  | 'student:create'
  | 'student:read'
  | 'student:update'
  | 'student:delete'
  | 'student:assign_consultant'
  
  // 导师管理
  | 'teacher:create'
  | 'teacher:read'
  | 'teacher:update'
  | 'teacher:delete'
  
  // 课程管理
  | 'course:create'
  | 'course:read'
  | 'course:update'
  | 'course:delete'
  
  // 排课管理
  | 'schedule:create'
  | 'schedule:read'
  | 'schedule:update'
  | 'schedule:delete'
  | 'schedule:auto_assign'
  
  // 选课单管理
  | 'selection:create'
  | 'selection:read'
  | 'selection:update'
  | 'selection:delete'
  | 'selection:approve'
  
  // 上课记录
  | 'record:create'
  | 'record:read'
  | 'record:update'
  | 'record:delete'
  
  // 工作流管理
  | 'workflow:create'
  | 'workflow:read'
  | 'workflow:update'
  | 'workflow:delete'
  | 'workflow:manage_tasks'
  
  // 数据统计
  | 'analytics:read'
  | 'analytics:export';

// 角色权限映射
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  '管理员': [
    // 管理员（顾问主管）拥有所有权限
    'system:manage',
    'system:view_logs',
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:manage_role',
    'student:create',
    'student:read',
    'student:update',
    'student:delete',
    'student:assign_consultant',
    'teacher:create',
    'teacher:read',
    'teacher:update',
    'teacher:delete',
    'course:create',
    'course:read',
    'course:update',
    'course:delete',
    'schedule:create',
    'schedule:read',
    'schedule:update',
    'schedule:delete',
    'schedule:auto_assign',
    'selection:create',
    'selection:read',
    'selection:update',
    'selection:delete',
    'selection:approve',
    'record:create',
    'record:read',
    'record:update',
    'record:delete',
    'workflow:create',
    'workflow:read',
    'workflow:update',
    'workflow:delete',
    'workflow:manage_tasks',
    'analytics:read',
    'analytics:export',
  ],
  
  '规划顾问': [
    // 规划顾问权限
    'user:read',
    'student:create',
    'student:read',
    'student:update',
    'student:delete',
    'student:assign_consultant',
    'teacher:read',
    'course:read',
    'schedule:create',
    'schedule:read',
    'schedule:update',
    'schedule:delete',
    'schedule:auto_assign',
    'selection:create',
    'selection:read',
    'selection:update',
    'selection:approve',
    'record:read',
    'workflow:create',
    'workflow:read',
    'workflow:update',
    'workflow:manage_tasks',
    'analytics:read',
    'analytics:export',
  ],
  
  '全职导师': [
    // 全职导师权限
    'student:read',
    'course:read',
    'schedule:read',
    'selection:read',
    'record:create',
    'record:read',
    'record:update',
    'workflow:read',
  ],
  
  '兼职导师': [
    // 兼职导师权限（最受限）
    'student:read',
    'course:read',
    'schedule:read',
    'record:create',
    'record:read',
    'record:update',
  ],
  
  '学生': [
    // 学生权限
    'course:read',
    'schedule:read',
    'selection:read',
  ],
};

// 角色显示名称
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  '管理员': '管理员（顾问主管）',
  '规划顾问': '规划顾问',
  '全职导师': '全职导师',
  '兼职导师': '兼职导师',
  '学生': '学生',
};

// 角色层级（数字越大权限越高）
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  '管理员': 100,
  '规划顾问': 60,
  '全职导师': 40,
  '兼职导师': 20,
  '学生': 10,
};

// 检查权限函数
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// 检查角色层级
export function isRoleAtLeast(role: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

// 获取用户可管理的角色
export function getManageableRoles(currentRole: UserRole): UserRole[] {
  const currentLevel = ROLE_HIERARCHY[currentRole] ?? 0;
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < currentLevel)
    .map(([role]) => role as UserRole);
}
