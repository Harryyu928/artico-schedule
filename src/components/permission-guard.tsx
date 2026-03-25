/**
 * 权限守卫组件
 * 用于保护需要特定权限的页面和功能
 */

'use client';

import { ReactNode } from 'react';
import { useUser } from '@/hooks/use-permissions';
import type { UserRole, Permission } from '@/types/permissions';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_HIERARCHY, ROLE_DISPLAY_NAMES } from '@/hooks/use-permissions';

// ==================== 辅助函数 ====================

// 检查角色层级
function checkIsRoleAtLeast(role: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

// ==================== 类型定义 ====================

interface PermissionGuardProps {
  permissions?: Permission | Permission[];
  requireAll?: boolean;
  role?: UserRole;
  fallback?: ReactNode;
  children: ReactNode;
}

interface RoleGuardProps {
  minRole: UserRole;
  fallback?: ReactNode;
  children: ReactNode;
}

// ==================== 权限守卫组件 ====================

/**
 * 权限守卫组件
 */
export function PermissionGuard({ 
  permissions, 
  requireAll = false, 
  role,
  fallback, 
  children 
}: PermissionGuardProps) {
  const { user, isLoading, hasPermission, hasAnyPermission, hasAllPermissions } = useUser();

  if (isLoading) return null;
  if (!user) return fallback ?? <AccessDenied message="请先登录" />;
  if (role && !checkIsRoleAtLeast(user.role, role)) {
    return fallback ?? <AccessDenied message="权限不足" />;
  }

  if (permissions) {
    const permissionList = Array.isArray(permissions) ? permissions : [permissions];
    const hasAccess = requireAll
      ? hasAllPermissions(permissionList)
      : hasAnyPermission(permissionList);

    if (!hasAccess) {
      return fallback ?? <AccessDenied message="您没有访问此功能的权限" />;
    }
  }

  return <>{children}</>;
}

/**
 * 角色守卫组件
 */
export function RoleGuard({ minRole, fallback, children }: RoleGuardProps) {
  const { user, isLoading } = useUser();

  if (isLoading) return null;
  if (!user || !checkIsRoleAtLeast(user.role, minRole)) {
    return fallback ?? <AccessDenied message="权限不足" />;
  }

  return <>{children}</>;
}

// ==================== 访问拒绝组件 ====================

function AccessDenied({ message = '访问被拒绝' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>访问受限</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}

// ==================== 角色切换器 ====================

export function RoleSwitcher() {
  const { user, switchRole } = useUser();
  if (!user) return null;

  const roles = Object.keys(ROLE_HIERARCHY) as UserRole[];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-hidden">当前:</span>
      <Select value={user.role} onValueChange={(value) => switchRole(value as UserRole)}>
        <SelectTrigger className="w-[100px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ==================== 条件渲染组件 ====================

interface ShowProps {
  permissions?: Permission | Permission[];
  requireAll?: boolean;
  role?: UserRole;
  children: ReactNode;
}

export function Show({ permissions, requireAll = false, role, children }: ShowProps) {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions } = useUser();

  if (!user) return null;
  if (role && !checkIsRoleAtLeast(user.role, role)) return null;

  if (permissions) {
    const permissionList = Array.isArray(permissions) ? permissions : [permissions];
    const hasAccess = requireAll
      ? hasAllPermissions(permissionList)
      : hasAnyPermission(permissionList);
    if (!hasAccess) return null;
  }

  return <>{children}</>;
}

// ==================== 导航菜单项过滤 ====================

export interface NavItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  permission?: Permission;
  minRole?: UserRole;
}

export function filterNavItems(items: NavItem[], userRole: UserRole | null): NavItem[] {
  if (!userRole) return [];
  
  return items.filter(item => {
    if (item.minRole && !checkIsRoleAtLeast(userRole, item.minRole)) return false;
    if (item.permission) {
      // 简化处理：这里需要实际的权限检查
      // 实际应调用权限检查函数
    }
    return true;
  });
}
