/**
 * 工作流任务清单 PDF 模板
 * 使用 @react-pdf/renderer 生成
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// PDF 样式
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #f97316',
    paddingBottom: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f97316',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f97316',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1px solid #fed7aa',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: '25%',
    color: '#6b7280',
  },
  value: {
    width: '75%',
    fontWeight: '500',
  },
  halfRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  halfField: {
    width: '50%',
    flexDirection: 'row',
  },
  halfLabel: {
    width: '45%',
    color: '#6b7280',
  },
  halfValue: {
    width: '55%',
    fontWeight: '500',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#fff7ed',
    borderRadius: 4,
    color: '#ea580c',
    fontSize: 9,
    alignSelf: 'flex-start',
  },
  tagGreen: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#dcfce7',
    borderRadius: 4,
    color: '#16a34a',
    fontSize: 9,
    alignSelf: 'flex-start',
  },
  tagGray: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    color: '#6b7280',
    fontSize: 9,
    alignSelf: 'flex-start',
  },
  tagBlue: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    color: '#2563eb',
    fontSize: 9,
    alignSelf: 'flex-start',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 4,
  },
  // 阶段卡片
  stageCard: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeft: '4px solid #6b7280',
  },
  stageCardActive: {
    borderLeftColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  stageCardCompleted: {
    borderLeftColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  stageProgress: {
    fontSize: 9,
    color: '#6b7280',
  },
  // 任务列表
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    marginBottom: 4,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  taskCheckbox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  taskName: {
    flex: 1,
    fontSize: 9,
  },
  taskNameCompleted: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  taskAssignee: {
    fontSize: 8,
    color: '#6b7280',
    marginRight: 8,
  },
  taskPriority: {
    fontSize: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  priorityHigh: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  priorityMedium: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  priorityLow: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: '1px solid #e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
  },
  summaryBox: {
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
});

// 状态映射
const STATUS_MAP: Record<string, { label: string; style: typeof styles.tag }> = {
  'pending': { label: '待处理', style: styles.tagGray },
  'in_progress': { label: '进行中', style: styles.tagBlue },
  'completed': { label: '已完成', style: styles.tagGreen },
  'skipped': { label: '已跳过', style: styles.tag },
  'blocked': { label: '已阻塞', style: styles.tag },
};

// 优先级映射
const PRIORITY_MAP: Record<string, { label: string; style: typeof styles.priorityHigh }> = {
  'high': { label: '高', style: styles.priorityHigh },
  'urgent': { label: '紧急', style: styles.priorityHigh },
  'medium': { label: '中', style: styles.priorityMedium },
  'low': { label: '低', style: styles.priorityLow },
};

// 工作流任务清单数据类型
export interface WorkflowPDFData {
  workflowName: string;
  workflowType: string;
  entityId: string;
  entityName: string;
  entityType: string;
  
  // 整体进度
  totalTasks: number;
  completedTasks: number;
  progress: number;
  status: string;
  
  // 时间
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  
  // 阶段列表
  stages: Array<{
    id: string;
    name: string;
    order: number;
    color: string;
    status: string;
    estimatedDays?: number;
    tasks: Array<{
      id: string;
      name: string;
      description?: string;
      status: string;
      priority: string;
      assigneeName?: string;
      assigneeRole?: string;
      dueDate?: string;
      completedAt?: string;
      notes?: string;
      checklist?: Array<{ text: string; completed: boolean }>;
    }>;
  }>;
  
  // 备注
  notes?: string;
}

// PDF 文档组件
export const WorkflowPDF = ({ data }: { data: WorkflowPDFData }) => {
  const getStatusTag = (status: string) => {
    const statusInfo = STATUS_MAP[status] || STATUS_MAP['pending'];
    return <Text style={statusInfo.style}>{statusInfo.label}</Text>;
  };

  const getPriorityTag = (priority: string) => {
    const priorityInfo = PRIORITY_MAP[priority] || PRIORITY_MAP['medium'];
    return <Text style={[styles.taskPriority, priorityInfo.style]}>{priorityInfo.label}</Text>;
  };

  const getStageCardStyle = (status: string) => {
    if (status === 'completed') {
      return [styles.stageCard, styles.stageCardCompleted];
    }
    if (status === 'in_progress') {
      return [styles.stageCard, styles.stageCardActive];
    }
    return styles.stageCard;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 页眉 */}
        <View style={styles.header}>
          <Text style={styles.logo}>ARTiCO</Text>
          <Text style={styles.subtitle}>艺术留学作品集辅导 · 工作流任务清单</Text>
        </View>

        {/* 标题 */}
        <Text style={styles.title}>{data.workflowName}</Text>

        {/* 概览信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本信息</Text>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>关联对象：</Text>
              <Text style={styles.halfValue}>{data.entityName}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>对象类型：</Text>
              <Text style={styles.halfValue}>{data.entityType}</Text>
            </View>
          </View>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>开始时间：</Text>
              <Text style={styles.halfValue}>{data.startedAt || '-'}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>截止日期：</Text>
              <Text style={styles.halfValue}>{data.dueDate || '-'}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>工作流状态：</Text>
            {getStatusTag(data.status)}
          </View>
        </View>

        {/* 进度概览 */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.completedTasks}</Text>
              <Text style={styles.summaryLabel}>已完成任务</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.totalTasks}</Text>
              <Text style={styles.summaryLabel}>总任务数</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.progress}%</Text>
              <Text style={styles.summaryLabel}>完成进度</Text>
            </View>
          </View>
          {/* 进度条 */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${data.progress}%` }]} />
          </View>
        </View>

        {/* 阶段任务列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>任务清单</Text>
          {data.stages.map((stage) => (
            <View key={stage.id} style={getStageCardStyle(stage.status)}>
              <View style={styles.stageHeader}>
                <Text style={styles.stageName}>
                  {stage.order}. {stage.name}
                </Text>
                <Text style={styles.stageProgress}>
                  {stage.tasks.filter(t => t.status === 'completed').length}/{stage.tasks.length} 完成
                </Text>
              </View>
              
              {/* 任务列表 */}
              {stage.tasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={
                    task.status === 'completed' 
                      ? [styles.taskCheckbox, styles.taskCheckboxChecked]
                      : styles.taskCheckbox
                  }>
                    {task.status === 'completed' && (
                      <Text style={{ color: '#ffffff', fontSize: 10 }}>✓</Text>
                    )}
                  </View>
                  <Text style={
                    task.status === 'completed'
                      ? [styles.taskName, styles.taskNameCompleted]
                      : styles.taskName
                  }>
                    {task.name}
                  </Text>
                  {task.assigneeName && (
                    <Text style={styles.taskAssignee}>{task.assigneeName}</Text>
                  )}
                  {getPriorityTag(task.priority)}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* 备注 */}
        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>备注</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {/* 页脚 */}
        <View style={styles.footer}>
          <Text>生成时间：{new Date().toLocaleString('zh-CN')}</Text>
          <Text>ARTiCO 教务管理系统</Text>
        </View>
      </Page>
    </Document>
  );
};
