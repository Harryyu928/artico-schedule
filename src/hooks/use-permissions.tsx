/**
 * 用户权限管理 Hooks
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { UserRole, Permission } from '@/types/permissions';
import { ROLE_HIERARCHY, ROLE_PERMISSIONS } from '@/types/permissions';

// 导出角色相关常量（从 permissions 类型重新导出）
export { ROLE_HIERARCHY, ROLE_DISPLAY_NAMES } from '@/types/permissions';

// 用户类型
interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  teacherId?: string;
  studentId?: string;
  consultantId?: string;
  teacher?: {
    id: string;
    name: string;
    type: string;
  };
  student?: {
    id: string;
    name: string;
    major: string;
  };
}

// 用户上下文类型
interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isRoleAtLeast: (requiredRole: UserRole) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// 用户 Provider
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化时尝试从 localStorage 恢复用户
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        // 默认使用管理员角色（开发模式）
        const defaultUser: User = {
          id: 'default-admin',
          name: '张主管',
          email: 'admin@artico.com',
          role: '管理员',
        };
        setUser(defaultUser);
        localStorage.setItem('user', JSON.stringify(defaultUser));
      }
    } catch (e) {
      console.error('Failed to load user from localStorage:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登录
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } else {
        setError(data.error || '登录失败');
        return false;
      }
    } catch (e) {
      setError('网络错误');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // 切换角色（开发模式）
  const switchRole = (role: UserRole) => {
    const roleNames: Record<UserRole, string> = {
      '管理员': '张主管',
      '规划顾问': '李顾问',
      '全职导师': '王导师',
      '兼职导师': '赵导师',
      '学生': '孙同学',
    };
    
    if (user) {
      const newUser = { ...user, role, name: roleNames[role] || '用户' };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };

  // 检查单个权限
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
  }, [user]);

  // 检查是否有任一权限
  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(p => ROLE_PERMISSIONS[user.role]?.includes(p));
  }, [user]);

  // 检查是否有所有权限
  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.every(p => ROLE_PERMISSIONS[user.role]?.includes(p));
  }, [user]);

  // 检查角色层级
  const isRoleAtLeast = useCallback((requiredRole: UserRole): boolean => {
    if (!user) return false;
    return (ROLE_HIERARCHY[user.role] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
  }, [user]);

  return (
    <UserContext.Provider value={{ 
      user, 
      isLoading, 
      error, 
      login, 
      logout, 
      switchRole,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isRoleAtLeast,
    }}>
      {children}
    </UserContext.Provider>
  );
}

// 使用用户 Hook
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// 权限检查 Hook
export function usePermissions() {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions, isRoleAtLeast } = useUser();
  
  // 检查是否有某个角色的权限
  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return isRoleAtLeast(requiredRole);
  };

  return { 
    hasRole, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    isRoleAtLeast 
  };
}

// 默认导出
export default { UserProvider, useUser, usePermissions };
