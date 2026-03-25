/**
 * 全局动画配置
 * 提供可复用的动画变体和过渡效果
 */

import { Variants, Transition } from 'framer-motion';

// ==================== 基础过渡配置 ====================
export const transitions = {
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
  springBouncy: { type: 'spring' as const, stiffness: 400, damping: 25 },
  springStiff: { type: 'spring' as const, stiffness: 500, damping: 35 },
  smooth: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  smoothSlow: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  easeOut: { duration: 0.3, ease: 'easeOut' as const },
  easeIn: { duration: 0.3, ease: 'easeIn' as const },
  easeInOut: { duration: 0.4, ease: 'easeInOut' as const },
};

// ==================== 页面入场动画 ====================
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3, ease: 'easeIn' }
  },
};

// ==================== 渐显动画 ====================
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  },
};

// ==================== 缩放动画 ====================
export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  },
};

// ==================== 从左滑入 ====================
export const slideInLeftVariants: Variants = {
  initial: { opacity: 0, x: -30 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    x: -30,
    transition: { duration: 0.2 }
  },
};

// ==================== 从右滑入 ====================
export const slideInRightVariants: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    x: 30,
    transition: { duration: 0.2 }
  },
};

// ==================== 从上滑入 ====================
export const slideInTopVariants: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2 }
  },
};

// ==================== 从下滑入 ====================
export const slideInBottomVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: { duration: 0.2 }
  },
};

// ==================== 交错容器动画 ====================
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
};

// ==================== 卡片悬停动画 ====================
export const cardHoverVariants: Variants = {
  initial: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -4,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  },
  tap: { 
    scale: 0.98,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  },
};

// ==================== 按钮动画 ====================
export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  },
  tap: { 
    scale: 0.98,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  },
};

// ==================== 列表项动画 ====================
export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2 }
  },
};

// ==================== 模态框动画 ====================
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: 20,
    transition: { duration: 0.2 }
  },
};

// ==================== 下拉菜单动画 ====================
export const dropdownVariants: Variants = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 500, damping: 35 }
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95,
    transition: { duration: 0.15 }
  },
};

// ==================== 表格行动画 ====================
export const tableRowVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 }
  },
};

// ==================== 数字计数动画 ====================
export const countUpVariants: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 20 }
  },
};

// ==================== 脉冲动画 ====================
export const pulseVariants: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ==================== 旋转动画 ====================
export const rotateVariants: Variants = {
  animate: {
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ==================== 浮动动画 ====================
export const floatVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ==================== 摇摆动画 ====================
export const shakeVariants: Variants = {
  animate: {
    x: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
    },
  },
};

// ==================== 成功动画 ====================
export const successVariants: Variants = {
  initial: { scale: 0, rotate: -180 },
  animate: { 
    scale: 1, 
    rotate: 0,
    transition: { type: 'spring', stiffness: 200, damping: 15 }
  },
};

// ==================== 错误抖动动画 ====================
export const errorShakeVariants: Variants = {
  animate: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.4,
    },
  },
};
