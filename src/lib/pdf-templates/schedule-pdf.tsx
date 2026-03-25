/**
 * 排课确认单 PDF 模板
 * 使用 @react-pdf/renderer 生成
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
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
  highlightBox: {
    padding: 15,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    borderLeft: '4px solid #f97316',
    marginBottom: 15,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ea580c',
    marginBottom: 8,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  highlightItem: {
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  signatureArea: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  signatureTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureField: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 5,
  },
  signatureBox: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  signedText: {
    color: '#16a34a',
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  qrText: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 5,
    textAlign: 'center',
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
  notesBox: {
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
});

// 星期映射
const WEEK_DAY_MAP: Record<string, string> = {
  '周一': '星期一',
  '周二': '星期二',
  '周三': '星期三',
  '周四': '星期四',
  '周五': '星期五',
  '周六': '星期六',
  '周日': '星期日',
};

// 排课确认单数据类型
export interface SchedulePDFData {
  scheduleId: string;
  
  // 学生信息
  studentName: string;
  studentId?: string;
  studentPhone?: string;
  studentEmail?: string;
  
  // 导师信息
  teacherName: string;
  teacherType?: string;
  teacherPhone?: string;
  teacherEmail?: string;
  
  // 课程信息
  courseName: string;
  courseType?: string;
  courseCategory?: string;
  
  // 排课信息
  classDate: string;
  weekDay: string;
  timeSlot: string;
  hours: number;
  
  // 状态
  status: string;
  
  // 备注
  notes?: string;
  
  // 签字信息
  studentSignature?: string;
  signatureTime?: string;
  signLink?: string;
  qrCodeDataUrl?: string;
}

// PDF 文档组件
export const SchedulePDF = ({ data }: { data: SchedulePDFData }) => {
  const getStatusTag = (status: string) => {
    switch (status) {
      case '已确认':
        return <Text style={styles.tagGreen}>{status}</Text>;
      case '已完成':
        return <Text style={styles.tagGreen}>{status}</Text>;
      case '待确认':
        return <Text style={styles.tag}>{status}</Text>;
      default:
        return <Text style={styles.tagGray}>{status}</Text>;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 页眉 */}
        <View style={styles.header}>
          <Text style={styles.logo}>ARTiCO</Text>
          <Text style={styles.subtitle}>艺术留学作品集辅导 · 排课确认单</Text>
        </View>

        {/* 标题 */}
        <Text style={styles.title}>排课确认单</Text>

        {/* 排课概览（高亮） */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>课程安排</Text>
          <View style={styles.highlightRow}>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>日期</Text>
              <Text style={styles.highlightValue}>{data.classDate}</Text>
            </View>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>星期</Text>
              <Text style={styles.highlightValue}>{WEEK_DAY_MAP[data.weekDay] || data.weekDay}</Text>
            </View>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>时间</Text>
              <Text style={styles.highlightValue}>{data.timeSlot}</Text>
            </View>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>课时</Text>
              <Text style={styles.highlightValue}>{data.hours} 小时</Text>
            </View>
          </View>
        </View>

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
              <Text style={styles.halfLabel}>联系电话：</Text>
              <Text style={styles.halfValue}>{data.studentPhone || '-'}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>邮箱：</Text>
              <Text style={styles.halfValue}>{data.studentEmail || '-'}</Text>
            </View>
          </View>
        </View>

        {/* 导师信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>导师信息</Text>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>导师姓名：</Text>
              <Text style={styles.halfValue}>{data.teacherName}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>导师类型：</Text>
              <Text style={styles.halfValue}>{data.teacherType || '-'}</Text>
            </View>
          </View>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>联系电话：</Text>
              <Text style={styles.halfValue}>{data.teacherPhone || '-'}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>邮箱：</Text>
              <Text style={styles.halfValue}>{data.teacherEmail || '-'}</Text>
            </View>
          </View>
        </View>

        {/* 课程信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>课程信息</Text>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>课程名称：</Text>
              <Text style={styles.halfValue}>{data.courseName}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>课程类型：</Text>
              <Text style={styles.halfValue}>{data.courseType || '-'}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>排课状态：</Text>
            {getStatusTag(data.status)}
          </View>
        </View>

        {/* 备注 */}
        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>备注</Text>
            <View style={styles.notesBox}>
              <Text>{data.notes}</Text>
            </View>
          </View>
        )}

        {/* 签字区域 */}
        <View style={styles.signatureArea}>
          <Text style={styles.signatureTitle}>确认签字</Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>导师签字：</Text>
              <View style={styles.signatureBox}>
                <Text style={styles.signedText}>已确认</Text>
              </View>
            </View>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>学生/家长签字：</Text>
              <View style={styles.signatureBox}>
                {data.studentSignature ? (
                  <Text style={styles.signedText}>
                    ✓ 已签字 ({data.signatureTime})
                  </Text>
                ) : (
                  <Text style={{ color: '#9ca3af', fontSize: 9 }}>待签字</Text>
                )}
              </View>
            </View>
          </View>

          {/* 签字二维码 */}
          {!data.studentSignature && data.qrCodeDataUrl && (
            <View style={styles.qrContainer}>
              <Image style={styles.qrImage} src={data.qrCodeDataUrl} />
              <Text style={styles.qrText}>
                扫描二维码在线签字{'\n'}
                链接有效期7天
              </Text>
            </View>
          )}
        </View>

        {/* 温馨提示 */}
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>温馨提示</Text>
          <Text style={styles.tipText}>
            1. 请在上课前确认排课信息，如有问题请及时联系教务老师{'\n'}
            2. 因个人原因无法上课的，请务必至少48小时告知{'\n'}
            3. 请学生/家长在上课前完成签字确认
          </Text>
        </View>

        {/* 页脚 */}
        <View style={styles.footer}>
          <Text>排课编号：{data.scheduleId}</Text>
          <Text>生成时间：{new Date().toLocaleString('zh-CN')}</Text>
          <Text>ARTiCO 教务管理系统</Text>
        </View>
      </Page>
    </Document>
  );
};
