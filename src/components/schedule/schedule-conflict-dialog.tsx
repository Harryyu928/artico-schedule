'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  UserX,
  CalendarX,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ExternalLink,
  Users,
  BookOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// 冲突类型枚举
export type ConflictType = 
  | 'no_student_time'      // 学生无可用时间
  | 'no_teacher'           // 无匹配导师
  | 'no_teacher_time'      // 导师无可用时间
  | 'time_conflict'        // 时间冲突（学生或导师已有排课）
  | 'teacher_busy'         // 导师已排满
  | 'student_busy'         // 学生该时段已有课
  | 'unknown';             // 未知错误

// 冲突详情接口
export interface ScheduleConflict {
  studentId: string;
  studentName: string;
  courseId?: string;
  courseName?: string;
  teacherId?: string;
  teacherName?: string;
  reason: string;
  type: ConflictType;
  // 详细冲突信息
  details?: {
    conflictingSchedules?: {
      date: string;
      timeSlot: string;
      weekDay: string;
      teacherName?: string;
      courseName?: string;
    }[];
    availableSlots?: {
      weekDay: string;
      timeSlot: string;
    }[];
    eligibleTeachers?: {
      id: string;
      name: string;
      majorDirections?: string[];
    }[];
    studentAvailableTimes?: {
      weekDay: string;
      timeSlot: string;
    }[];
  };
}

// 解决方案接口
interface Solution {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface ScheduleConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ScheduleConflict[];
  onNavigate?: (path: string) => void;
}

// 根据冲突类型获取图标和颜色
const getConflictStyle = (type: ConflictType) => {
  switch (type) {
    case 'no_student_time':
      return {
        icon: CalendarX,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: '学生无可用时间',
      };
    case 'no_teacher':
      return {
        icon: UserX,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: '无匹配导师',
      };
    case 'no_teacher_time':
      return {
        icon: Clock,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        label: '导师无可用时间',
      };
    case 'time_conflict':
    case 'student_busy':
    case 'teacher_busy':
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: '时间冲突',
      };
    default:
      return {
        icon: AlertCircle,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: '排课失败',
      };
  }
};

// 根据冲突类型生成解决方案
const getSolutions = (conflict: ScheduleConflict): Solution[] => {
  const solutions: Solution[] = [];

  switch (conflict.type) {
    case 'no_student_time':
      solutions.push({
        title: '添加学生可用时间',
        description: '前往学生时间表，添加学生的可用上课时间段',
        action: {
          label: '设置时间表',
          href: `/time-table/student?studentId=${conflict.studentId}`,
        },
      });
      break;

    case 'no_teacher':
      solutions.push({
        title: '检查课程配置',
        description: '确认该课程类型是否有导师可以教授，或调整课程类型',
        action: {
          label: '查看导师',
          href: '/teachers',
        },
      });
      solutions.push({
        title: '调整导师方向',
        description: '为现有导师添加该课程方向的授课能力',
        action: {
          label: '管理导师',
          href: '/teachers',
        },
      });
      break;

    case 'no_teacher_time':
      solutions.push({
        title: '检查导师时间表',
        description: '查看导师的可用时间是否与学生时间有交集',
        action: {
          label: '查看时间表',
          href: `/time-table/teacher?teacherId=${conflict.teacherId}`,
        },
      });
      solutions.push({
        title: '联系导师添加时间',
        description: '通知导师添加更多可用时间段',
      });
      break;

    case 'time_conflict':
    case 'student_busy':
      solutions.push({
        title: '调整已有排课',
        description: '学生该时间段已有其他课程，可尝试调整已有排课',
        action: {
          label: '查看排课',
          href: '/schedules',
        },
      });
      solutions.push({
        title: '添加更多可用时间',
        description: '为学生添加更多可用时间段',
        action: {
          label: '设置时间表',
          href: `/time-table/student?studentId=${conflict.studentId}`,
        },
      });
      break;

    case 'teacher_busy':
      solutions.push({
        title: '更换导师',
        description: '该导师该时段已有排课，可尝试其他导师',
        action: {
          label: '查看导师',
          href: '/teachers',
        },
      });
      solutions.push({
        title: '调整导师时间',
        description: '为导师添加更多可用时间或调整已有排课',
        action: {
          label: '设置时间表',
          href: `/time-table/teacher?teacherId=${conflict.teacherId}`,
        },
      });
      break;

    default:
      solutions.push({
        title: '手动排课',
        description: '尝试手动选择导师和时间进行排课',
      });
  }

  return solutions;
};

// 解析冲突原因，推断冲突类型
export const parseConflictType = (reason: string): ConflictType => {
  if (reason.includes('学生没有可用时间') || reason.includes('无可用时间')) {
    return 'no_student_time';
  }
  if (reason.includes('没有导师可以教授') || reason.includes('无匹配导师')) {
    return 'no_teacher';
  }
  if (reason.includes('导师无可用时间') || reason.includes('导师没有时间')) {
    return 'no_teacher_time';
  }
  if (reason.includes('学生') && (reason.includes('冲突') || reason.includes('已有'))) {
    return 'student_busy';
  }
  if (reason.includes('导师') && (reason.includes('冲突') || reason.includes('已排满'))) {
    return 'teacher_busy';
  }
  if (reason.includes('冲突') || reason.includes('无法找到合适的时间')) {
    return 'time_conflict';
  }
  return 'unknown';
};

// 冲突卡片组件
const ConflictCard = ({ 
  conflict, 
  expanded,
  onToggle,
  onNavigate,
}: { 
  conflict: ScheduleConflict;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: (path: string) => void;
}) => {
  const style = getConflictStyle(conflict.type);
  const Icon = style.icon;
  const solutions = getSolutions(conflict);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'rounded-lg border transition-all',
        style.borderColor,
        expanded ? style.bgColor : 'bg-white'
      )}
    >
      {/* 冲突概要 */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-start gap-3 text-left"
      >
        <div className={cn('p-2 rounded-lg', style.bgColor)}>
          <Icon className={cn('w-5 h-5', style.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{conflict.courseName || '未知课程'}</span>
            <Badge variant="outline" className={cn('text-xs', style.color, style.borderColor)}>
              {style.label}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {conflict.studentName} · {conflict.reason}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* 展开详情 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* 详细冲突信息 */}
              {conflict.details?.conflictingSchedules && conflict.details.conflictingSchedules.length > 0 && (
                <div className="bg-white rounded-lg p-3 border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    冲突的排课记录
                  </h4>
                  <div className="space-y-1">
                    {conflict.details.conflictingSchedules.slice(0, 5).map((schedule, idx) => (
                      <div key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {schedule.weekDay} {schedule.timeSlot}
                        </Badge>
                        <span>{schedule.date}</span>
                        {schedule.courseName && (
                          <span className="text-gray-400">· {schedule.courseName}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 可用时间提示 */}
              {conflict.details?.studentAvailableTimes && conflict.details.studentAvailableTimes.length > 0 && (
                <div className="bg-white rounded-lg p-3 border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-green-500" />
                    学生可用时间
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {conflict.details.studentAvailableTimes.slice(0, 10).map((time, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {time.weekDay} {time.timeSlot}
                      </Badge>
                    ))}
                    {conflict.details.studentAvailableTimes.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{conflict.details.studentAvailableTimes.length - 10} 更多
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* 可匹配导师 */}
              {conflict.details?.eligibleTeachers && conflict.details.eligibleTeachers.length > 0 && (
                <div className="bg-white rounded-lg p-3 border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    可匹配导师
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {conflict.details.eligibleTeachers.map((teacher) => (
                      <Badge key={teacher.id} variant="outline" className="text-xs">
                        {teacher.name}
                        {teacher.majorDirections && teacher.majorDirections.length > 0 && (
                          <span className="text-gray-400 ml-1">
                            ({teacher.majorDirections.slice(0, 2).join(', ')})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 解决方案 */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-100">
                <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
                  <Lightbulb className="w-4 h-4" />
                  建议解决方案
                </h4>
                <div className="space-y-2">
                  {solutions.map((solution, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{solution.title}</p>
                        <p className="text-xs text-gray-500">{solution.description}</p>
                      </div>
                      {solution.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 text-orange-600 border-orange-200 hover:bg-orange-100"
                          onClick={() => {
                            if (solution.action?.href && onNavigate) {
                              onNavigate(solution.action.href);
                            }
                          }}
                        >
                          {solution.action.label}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export function ScheduleConflictDialog({
  open,
  onOpenChange,
  conflicts,
  onNavigate,
}: ScheduleConflictDialogProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // 按类型分组统计
  const conflictStats = conflicts.reduce((acc, c) => {
    const type = c.type || parseConflictType(c.reason);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<ConflictType, number>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            排课冲突详情
          </DialogTitle>
          <DialogDescription>
            {conflicts.length > 0 
              ? `共 ${conflicts.length} 个课程排课失败，请查看详情并处理`
              : '没有排课冲突'}
          </DialogDescription>
        </DialogHeader>

        {/* 冲突统计 */}
        <div className="flex flex-wrap gap-2 py-2 border-b">
          {Object.entries(conflictStats).map(([type, count]) => {
            const style = getConflictStyle(type as ConflictType);
            const Icon = style.icon;
            return (
              <Badge 
                key={type} 
                variant="outline"
                className={cn('flex items-center gap-1', style.borderColor, style.color)}
              >
                <Icon className="w-3 h-3" />
                {style.label}: {count}
              </Badge>
            );
          })}
        </div>

        {/* 冲突列表 */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {conflicts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>所有课程都已成功排课</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {conflicts.map((conflict, index) => (
                <ConflictCard
                  key={`${conflict.studentId}-${conflict.courseId}-${index}`}
                  conflict={conflict}
                  expanded={expandedIndex === index}
                  onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  onNavigate={(path) => {
                    onOpenChange(false);
                    onNavigate?.(path);
                  }}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-500">
            点击展开查看详细解决方案
          </p>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleConflictDialog;
