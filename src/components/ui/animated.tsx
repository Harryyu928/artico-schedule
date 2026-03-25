/**
 * 动画组件库
 * 提供可复用的动画包装组件
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  pageVariants,
  fadeVariants,
  scaleVariants,
  slideInLeftVariants,
  slideInRightVariants,
  slideInTopVariants,
  slideInBottomVariants,
  staggerContainerVariants,
  staggerItemVariants,
  cardHoverVariants,
  buttonVariants,
  listItemVariants,
  modalVariants,
  transitions,
} from '@/lib/animations';

// ==================== 页面容器 ====================
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn('space-y-6', className)}
    >
      {children}
    </motion.div>
  );
}

// ==================== 页面标题 ====================
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn('flex justify-between items-start', className)}
    >
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          {title}
        </h1>
        {description && (
          <p className="text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex gap-2"
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
  );
}

// ==================== 动画卡片 ====================
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  onClick?: () => void;
}

export function AnimatedCard({ children, className, delay = 0, hover = true, onClick }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={cn('bg-white border border-slate-200 shadow-sm', onClick && 'cursor-pointer', className)}
    >
      {children}
    </motion.div>
  );
}

// ==================== 交错列表容器 ====================
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerContainer({ children, className, delay = 0 }: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ==================== 交错列表项 ====================
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ==================== 动画按钮 ====================
interface AnimatedButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function AnimatedButton({
  children,
  className,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
}: AnimatedButtonProps) {
  const variantStyles = {
    primary: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    outline: 'border border-gray-300 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600',
    ghost: 'hover:bg-gray-100 text-gray-700',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <motion.button
      variants={buttonVariants}
      initial="initial"
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "tap"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </motion.button>
  );
}

// ==================== 统计卡片 ====================
interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
  delay?: number;
}

export function StatCard({ title, value, icon, trend, className, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, type: 'spring', stiffness: 300 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        'bg-white rounded-2xl p-6 shadow-md border border-slate-200 relative overflow-hidden group',
        className
      )}
    >
      {/* 装饰性背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-amber-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <motion.p 
            className="text-3xl font-bold text-slate-800"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay + 0.1, type: 'spring' }}
          >
            {value}
          </motion.p>
          {trend && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.2 }}
              className={cn(
                'text-sm mt-2 flex items-center gap-1',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </motion.p>
          )}
        </div>
        {icon && (
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: delay }}
            className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl text-orange-600"
          >
            {icon}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ==================== 表格容器 ====================
interface AnimatedTableProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedTable({ children, className }: AnimatedTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn('overflow-hidden rounded-xl border border-slate-200 shadow-md bg-white', className)}
    >
      {children}
    </motion.div>
  );
}

// ==================== 空状态 ====================
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
    >
      {icon && (
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="mb-4 text-gray-300"
        >
          {icon}
        </motion.div>
      )}
      <h3 className="text-lg font-medium text-gray-600 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 mb-4 max-w-sm">{description}</p>
      )}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}

// ==================== 加载状态 ====================
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={cn(
        'rounded-full border-2 border-gray-200 border-t-orange-500',
        sizeStyles[size],
        className
      )}
    />
  );
}

// ==================== 淡入淡出包装器 ====================
interface FadeWrapperProps {
  children: React.ReactNode;
  show: boolean;
  className?: string;
}

export function FadeWrapper({ children, show, className }: FadeWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== 滑动面板 ====================
interface SlidePanelProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  className?: string;
}

export function SlidePanel({ children, isOpen, onClose, side = 'right', className }: SlidePanelProps) {
  const variants = side === 'right' ? slideInRightVariants : slideInLeftVariants;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          
          {/* 面板 */}
          <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'fixed top-0 bottom-0 z-50 bg-white shadow-2xl overflow-auto',
              side === 'right' ? 'right-0' : 'left-0',
              className
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== 数字动画 ====================
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, duration = 1, className }: AnimatedNumberProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={value}
      className={className}
    >
      <motion.span
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: duration * 0.5, type: 'spring' }}
      >
        {value.toLocaleString()}
      </motion.span>
    </motion.span>
  );
}

// ==================== 进度条动画 ====================
interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}

export function AnimatedProgress({ value, max = 100, className, color = 'orange' }: AnimatedProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={cn('h-2 bg-gray-100 rounded-full overflow-hidden', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={cn(
          'h-full rounded-full',
          color === 'orange' && 'bg-gradient-to-r from-orange-500 to-amber-500',
          color === 'green' && 'bg-gradient-to-r from-green-500 to-emerald-500',
          color === 'blue' && 'bg-gradient-to-r from-blue-500 to-cyan-500',
          color === 'red' && 'bg-gradient-to-r from-red-500 to-pink-500',
        )}
      />
    </div>
  );
}

// ==================== 徽章动画 ====================
interface AnimatedBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function AnimatedBadge({ children, variant = 'default', className }: AnimatedBadgeProps) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500 }}
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </motion.span>
  );
}

// ==================== 列表动画容器 ====================
interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={listItemVariants}
      whileHover={{ x: 4, backgroundColor: 'rgba(249, 115, 22, 0.05)' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
