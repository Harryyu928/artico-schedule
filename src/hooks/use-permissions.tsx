/**
 * 权限管理 Hook
 * 提供权限检查和角色管理功能
 */

'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import type { UserRole, Permission } from '@/types/permissions';

// 权限常量（从permissions.ts复制，避免服务端/客户端混用问题）
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  '管理员': [
    'system:manage', 'system:view_logs',
    'user:create', 'user:read', 'user:update', 'user:delete', 'user:manage_role',
    'student:create', 'student:read', 'student:update', 'student:delete', 'student:assign_consultant',
    'teacher:create', 'teacher:read', 'teacher:update', 'teacher:delete',
    'course:create', 'course:read', 'course:update', 'course:delete',
    'schedule:create', 'schedule:read', 'schedule:update', 'schedule:delete', 'schedule:auto_assign',
    'selection:create', 'selection:read', 'selection:update', 'selection:delete', 'selection:approve',
    'record:create', 'record:read', 'record:update', 'record:delete',
    'workflow:create', 'workflow:read', 'workflow:update', 'workflow:delete', 'workflow:manage_tasks',
    'analytics:read', 'analytics:export',
  ],
  '规划顾问': [
    'user:read', 'student:create', 'student:read', 'student:update', 'student:delete', 'student:assign_consultant',
    'teacher:read', 'course:read',
    'schedule:create', 'schedule:read', 'schedule:update', 'schedule:delete', 'schedule:auto_assign',
    'selection:create', 'selection:read', 'selection:update', 'selection:approve',
    'record:read',
    'workflow:create', 'workflow:read', 'workflow:update', 'workflow:manage_tasks',
    'analytics:read', 'analytics:export',
  ],
  '全职导师': [
    'student:read', 'course:read', 'schedule:read', 'selection:read',
    'record:create', 'record:read', 'record:update',
    'workflow:read',
  ],
  '兼职导师': [
    'student:read', 'course:read', 'schedule:read',
    'record:create', 'record:read', 'record:update',
  ],
  '学生': [
    'course:read', 'schedule:read', 'selection:read',
  ],
};

const ROLE_HIERARCHY: Record<UserRole, number> = {
  '管理员': 100,
  '规划顾问': 60,
  '全职导师': 40,
  '兼职导师': 20,
  '学生': 10,
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  '管理员': '管理员（顾问主管）',
  '规划顾问': '规划顾问',
  '全职导师': '全职导师',
  '兼职导师': '兼职导师',
  '学生': '学生',
};

// 检查权限函数
function checkHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// 检查角色层级
function checkIsRoleAtLeast(role: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

// 用户上下文类型
interface UserContextType {
  user: {
    id: string;
    name: string;
    role: UserRole;
    email?: string;
    avatar?: string;
    // 关联实体ID（用于数据过滤）
    teacherId?: string;      // 导师ID（导师角色关联）
    studentId?: string;      // 学生ID（学生角色关联）
    consultantId?: string;   // 顾问ID（规划顾问角色关联）
  } | null;
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isRoleAtLeast: (requiredRole: UserRole) => boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

// 创建用户上下文
const UserContext = createContext<UserContextType | null>(null);

// 模拟用户数据（包含与业务实体的关联）
// 注意：teacherId 应对应 teachers 表中的真实导师ID
const MOCK_USERS: Record<UserRole, { 
  id: string; 
  name: string; 
  email: string;
  teacherId?: string;
  studentId?: string;
  consultantId?: string;
}> = {
  '管理员': { 
    id: 'admin-001', 
    name: '张主管', 
    email: 'admin@artico.com',
    // 管理员不需要关联实体，可查看全部数据
  },
  '规划顾问': { 
    id: 'consultant-001', 
    name: '李顾问', 
    email: 'consultant@artico.com',
    consultantId: 'consultant-001',
    // 规划顾问可看到负责学生的数据
  },
  '全职导师': { 
    id: 'teacher-ft-001', 
    name: '李坤安', 
    email: 'teacher@artico.com',
    // 关联到 teachers 表中实际存在的导师（李坤安，有 2061 条上课记录）
    teacherId: 'd0493a56-0278-4cd5-b28d-bfb96afdc097',
  },
  '兼职导师': { 
    id: 'teacher-pt-001', 
    name: '胡家辉', 
    email: 'parttime@artico.com',
    // 关联到 teachers 表中的兼职导师
    teacherId: 'dea7fada-bcf3-4f5e-b0f5-d12ecc1d3543',
  },
  '学生': { 
    id: 'student-001', 
    name: '田政轩', 
    email: 'student@artico.com',
    // 关联到 students 表中实际存在的学生
    studentId: 'b7bb772f-5ac8-48d0-83e5-670125c977cd',
  },
};

// 用户 Provider 组件
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserContextType['user']>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化
  useEffect(() => {
    const savedRole = localStorage.getItem('user_role') as UserRole | null;
    const role = savedRole && Object.keys(ROLE_HIERARCHY).includes(savedRole) 
      ? savedRole 
      : '管理员';
    
    const mockUser = MOCK_USERS[role];
    setUser({
      id: mockUser.id,
      name: mockUser.name,
      role,
      email: mockUser.email,
      // 设置关联实体ID
      teacherId: mockUser.teacherId,
      studentId: mockUser.studentId,
      consultantId: mockUser.consultantId,
    });
    
    if (!savedRole) {
      localStorage.setItem('user_role', role);
    }
    setIsLoading(false);
  }, []);

  // 检查权限
  const hasPermissionCb = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    return checkHasPermission(user.role, permission);
  }, [user]);

  const hasAnyPermissionCb = useCallback((permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(p => checkHasPermission(user.role, p));
  }, [user]);

  const hasAllPermissionsCb = useCallback((permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.every(p => checkHasPermission(user.role, p));
  }, [user]);

  const isRoleAtLeastCb = useCallback((requiredRole: UserRole): boolean => {
    if (!user) return false;
    return checkIsRoleAtLeast(user.role, requiredRole);
  }, [user]);

  const login = useCallback((role: UserRole) => {
    const mockUser = MOCK_USERS[role];
    setUser({
      id: mockUser.id,
      name: mockUser.name,
      role,
      email: mockUser.email,
      // 设置关联实体ID
      teacherId: mockUser.teacherId,
      studentId: mockUser.studentId,
      consultantId: mockUser.consultantId,
    });
    localStorage.setItem('user_role', role);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user_role');
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const mockUser = MOCK_USERS[role];
    setUser(prev => prev ? {
      ...prev,
      id: mockUser.id,
      name: mockUser.name,
      role,
      email: mockUser.email,
      // 更新关联实体ID
      teacherId: mockUser.teacherId,
      studentId: mockUser.studentId,
      consultantId: mockUser.consultantId,
    } : null);
    localStorage.setItem('user_role', role);
  }, []);

  const value: UserContextType = {
    user,
    isLoading,
    hasPermission: hasPermissionCb,
    hasAnyPermission: hasAnyPermissionCb,
    hasAllPermissions: hasAllPermissionsCb,
    isRoleAtLeast: isRoleAtLeastCb,
    login,
    logout,
    switchRole,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// 使用用户上下文的 Hook
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// 使用权限检查的 Hook
export function usePermissions() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isRoleAtLeast, user } = useUser();
  
  return {
    role: user?.role,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRoleAtLeast,
    canManageUsers: hasPermission('user:manage_role'),
    canViewLogs: hasPermission('system:view_logs'),
    canExportData: hasPermission('analytics:export'),
  };
}

// 导出
export { ROLE_HIERARCHY };
export type { UserRole, Permission };
