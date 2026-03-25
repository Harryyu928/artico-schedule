/**
 * 学生时间表 PDF 模板
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
  // 时间表网格
  timetable: {
    marginTop: 10,
  },
  timetableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff7ed',
    borderBottom: '1px solid #fed7aa',
  },
  timetableHeaderCell: {
    width: '14.28%',
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ea580c',
    textAlign: 'center',
  },
  timetableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
  },
  timetableCell: {
    width: '14.28%',
    padding: 6,
    fontSize: 8,
    textAlign: 'center',
    borderRight: '1px solid #e5e7eb',
  },
  timetableCellLast: {
    width: '14.28%',
    padding: 6,
    fontSize: 8,
    textAlign: 'center',
  },
  timeCell: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
  },
  availableCell: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  unavailableCell: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  reservedCell: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  courseCell: {
    backgroundColor: '#dbeafe',
    color: '#2563eb',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendDotGreen: {
    backgroundColor: '#dcfce7',
  },
  legendDotYellow: {
    backgroundColor: '#fef3c7',
  },
  legendDotBlue: {
    backgroundColor: '#dbeafe',
  },
  legendDotRed: {
    backgroundColor: '#fef2f2',
  },
  legendText: {
    fontSize: 8,
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
  tipBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
  tipTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 8,
    color: '#78350f',
    lineHeight: 1.4,
  },
});

// 星期列表
const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 时间段列表
const TIME_SLOTS = ['10:00', '13:00', '15:00', '18:00', '20:00'];

// 预留类型映射
const RESERVATION_TYPE_MAP: Record<string, { label: string; style: typeof styles.availableCell }> = {
  '空闲': { label: '✓', style: styles.availableCell },
  '顾问指导': { label: '顾问', style: styles.reservedCell },
  '固定课程': { label: '课程', style: styles.courseCell },
  '不可用': { label: '✗', style: styles.unavailableCell },
};

// 时间表数据类型
export interface TimetablePDFData {
  studentName: string;
  studentId?: string;
  major?: string;
  consultantName?: string;
  
  // 时间表数据
  timetable: Record<string, Record<string, {
    isAvailable: boolean;
    reservationType: string;
    notes?: string;
  }>>;
  
  // 统计信息
  totalAvailableSlots: number;
  totalReservedSlots: number;
  totalCourseSlots: number;
  totalUnavailableSlots: number;
  
  // 备注
  notes?: string;
}

// PDF 文档组件
export const TimetablePDF = ({ data }: { data: TimetablePDFData }) => {
  // 获取单元格样式
  const getCellStyle = (weekDay: string, timeSlot: string) => {
    const slot = data.timetable[weekDay]?.[timeSlot];
    if (!slot) return styles.timetableCell;
    
    const typeInfo = RESERVATION_TYPE_MAP[slot.reservationType];
    if (typeInfo) {
      return { ...styles.timetableCell, ...typeInfo.style };
    }
    
    return slot.isAvailable 
      ? { ...styles.timetableCell, ...styles.availableCell }
      : styles.timetableCell;
  };

  // 获取单元格内容
  const getCellContent = (weekDay: string, timeSlot: string) => {
    const slot = data.timetable[weekDay]?.[timeSlot];
    if (!slot) return '-';
    
    const typeInfo = RESERVATION_TYPE_MAP[slot.reservationType];
    if (typeInfo) {
      return typeInfo.label;
    }
    
    return slot.isAvailable ? '✓' : '-';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 页眉 */}
        <View style={styles.header}>
          <Text style={styles.logo}>ARTiCO</Text>
          <Text style={styles.subtitle}>艺术留学作品集辅导 · 学生时间表</Text>
        </View>

        {/* 标题 */}
        <Text style={styles.title}>学生可用时间表</Text>

        {/* 学生信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>学生信息</Text>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>学生姓名：</Text>
              <Text style={styles.halfValue}>{data.studentName}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>学生编号：</Text>
              <Text style={styles.halfValue}>{data.studentId || '-'}</Text>
            </View>
          </View>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>专业方向：</Text>
              <Text style={styles.halfValue}>{data.major || '-'}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>规划顾问：</Text>
              <Text style={styles.halfValue}>{data.consultantName || '-'}</Text>
            </View>
          </View>
        </View>

        {/* 时间表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>可用时间</Text>
          <View style={styles.timetable}>
            {/* 表头 */}
            <View style={styles.timetableHeader}>
              <Text style={styles.timetableHeaderCell}>时间</Text>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={styles.timetableHeaderCell}>{day}</Text>
              ))}
            </View>
            
            {/* 数据行 */}
            {TIME_SLOTS.map((timeSlot) => (
              <View key={timeSlot} style={styles.timetableRow}>
                <Text style={[styles.timetableCell, styles.timeCell]}>{timeSlot}</Text>
                {WEEK_DAYS.map((weekDay, index) => (
                  <Text 
                    key={weekDay} 
                    style={index === WEEK_DAYS.length - 1 ? styles.timetableCellLast : getCellStyle(weekDay, timeSlot)}
                  >
                    {getCellContent(weekDay, timeSlot)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          
          {/* 图例 */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotGreen]} />
              <Text style={styles.legendText}>可用</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotYellow]} />
              <Text style={styles.legendText}>顾问指导</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotBlue]} />
              <Text style={styles.legendText}>固定课程</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotRed]} />
              <Text style={styles.legendText}>不可用</Text>
            </View>
          </View>
        </View>

        {/* 统计信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>统计信息</Text>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>可用时段：</Text>
              <Text style={styles.halfValue}>{data.totalAvailableSlots} 个</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>固定课程：</Text>
              <Text style={styles.halfValue}>{data.totalCourseSlots} 个</Text>
            </View>
          </View>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>顾问指导：</Text>
              <Text style={styles.halfValue}>{data.totalReservedSlots} 个</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>不可用：</Text>
              <Text style={styles.halfValue}>{data.totalUnavailableSlots} 个</Text>
            </View>
          </View>
        </View>

        {/* 备注 */}
        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>备注</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {/* 温馨提示 */}
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>温馨提示</Text>
          <Text style={styles.tipText}>
            1. 请准确填写您的可用时间段，以便系统为您合理安排课程{'\n'}
            2. 如需调整时间表，请联系您的规划顾问或教务老师{'\n'}
            3. 时间表变更后，相关的排课安排可能会受到影响
          </Text>
        </View>

        {/* 页脚 */}
        <View style={styles.footer}>
          <Text>生成时间：{new Date().toLocaleString('zh-CN')}</Text>
          <Text>ARTiCO 教务管理系统</Text>
        </View>
      </Page>
    </Document>
  );
};
