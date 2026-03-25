/**
 * 选课单 PDF 模板
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
  thirdRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  thirdField: {
    width: '33.33%',
    flexDirection: 'row',
  },
  thirdLabel: {
    width: '50%',
    color: '#6b7280',
  },
  thirdValue: {
    width: '50%',
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
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff7ed',
    padding: 8,
    borderBottom: '1px solid #fed7aa',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e5e7eb',
  },
  tableCell: {
    fontSize: 9,
  },
  col1: { width: '25%' },
  col2: { width: '15%' },
  col3: { width: '15%' },
  col4: { width: '15%' },
  col5: { width: '15%' },
  col6: { width: '15%' },
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
  goalsBox: {
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderLeft: '3px solid #22c55e',
  },
  notesBox: {
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
});

// 课程类别映射
const COURSE_CATEGORY_MAP: Record<string, string> = {
  'F-GD': '游戏设计基础',
  'F-TA': '技术美术基础',
  'F-GA': '游戏美术基础',
  'F-3D': '3D制作基础',
  'F-AN': '动画基础',
  'P-GD': '游戏设计项目',
  'P-AN': '动画项目',
  'P-GA': '游戏美术项目',
  'P-CA': '角色设计项目',
  'P-3DGA': '3D游戏美术项目',
};

// 状态映射
const STATUS_MAP: Record<string, string> = {
  '草稿': '草稿',
  '已确认': '已确认',
  '执行中': '执行中',
  '已完成': '已完成',
  '已取消': '已取消',
};

// 选课单数据类型
export interface SelectionFormPDFData {
  formId: string;
  studentName: string;
  studentId?: string;
  major?: string;
  applicationCountry?: string;
  currentStage?: string;
  consultantName?: string;
  
  // 规划信息
  totalPlannedHours: number;
  estimatedStartDate: string;
  estimatedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // 进度统计
  totalCourses: number;
  completedCourses: number;
  totalHours: number;
  completedHours: number;
  
  // 状态
  status: string;
  
  // 课程列表
  courses: Array<{
    courseName: string;
    courseType: string;
    courseStage: string;
    plannedHours: number;
    completedHours: number;
    status: string;
    priority: number;
    plannedStartDate?: string;
    plannedEndDate?: string;
    notes?: string;
  }>;
  
  // 备注
  notes?: string;
  goals?: string;
  
  // 签字信息
  studentSignature?: string;
  signatureTime?: string;
  signLink?: string;
  qrCodeDataUrl?: string;
  
  // 顾问签字
  consultantSignature?: string;
  consultantSignatureTime?: string;
}

// PDF 文档组件
export const SelectionFormPDF = ({ data }: { data: SelectionFormPDFData }) => {
  const progressPercent = data.totalHours > 0 
    ? Math.round((data.completedHours / data.totalHours) * 100) 
    : 0;

  const getStatusTag = (status: string) => {
    switch (status) {
      case '已完成':
        return <Text style={styles.tagGreen}>{status}</Text>;
      case '执行中':
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
          <Text style={styles.subtitle}>艺术留学作品集辅导 · 选课单</Text>
        </View>

        {/* 标题 */}
        <Text style={styles.title}>课程选课单</Text>

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
              <Text style={styles.halfLabel}>申请国家：</Text>
              <Text style={styles.halfValue}>{data.applicationCountry || '-'}</Text>
            </View>
          </View>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>当前阶段：</Text>
              <Text style={styles.halfValue}>{data.currentStage || '-'}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>规划顾问：</Text>
              <Text style={styles.halfValue}>{data.consultantName || '-'}</Text>
            </View>
          </View>
        </View>

        {/* 规划信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>规划信息</Text>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>计划开始：</Text>
              <Text style={styles.halfValue}>{data.estimatedStartDate}</Text>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.halfLabel}>计划结束：</Text>
              <Text style={styles.halfValue}>{data.estimatedEndDate}</Text>
            </View>
          </View>
          {data.actualStartDate && (
            <View style={styles.halfRow}>
              <View style={styles.halfField}>
                <Text style={styles.halfLabel}>实际开始：</Text>
                <Text style={styles.halfValue}>{data.actualStartDate}</Text>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.halfLabel}>实际结束：</Text>
                <Text style={styles.halfValue}>{data.actualEndDate || '进行中'}</Text>
              </View>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>选课单状态：</Text>
            {getStatusTag(data.status)}
          </View>
        </View>

        {/* 学习目标 */}
        {data.goals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>学习目标</Text>
            <View style={styles.goalsBox}>
              <Text>{data.goals}</Text>
            </View>
          </View>
        )}

        {/* 课程进度概览 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>课程进度概览</Text>
          <View style={styles.thirdRow}>
            <View style={styles.thirdField}>
              <Text style={styles.thirdLabel}>课程总数：</Text>
              <Text style={styles.thirdValue}>{data.totalCourses} 门</Text>
            </View>
            <View style={styles.thirdField}>
              <Text style={styles.thirdLabel}>已完成：</Text>
              <Text style={styles.thirdValue}>{data.completedCourses} 门</Text>
            </View>
            <View style={styles.thirdField}>
              <Text style={styles.thirdLabel}>完成率：</Text>
              <Text style={styles.thirdValue}>{data.totalCourses > 0 ? Math.round((data.completedCourses / data.totalCourses) * 100) : 0}%</Text>
            </View>
          </View>
          <View style={styles.thirdRow}>
            <View style={styles.thirdField}>
              <Text style={styles.thirdLabel}>总课时：</Text>
              <Text style={styles.thirdValue}>{data.totalHours} 小时</Text>
            </View>
            <View style={styles.thirdField}>
              <Text style={styles.thirdLabel}>已完成：</Text>
              <Text style={styles.thirdValue}>{data.completedHours} 小时</Text>
            </View>
            <View style={styles.thirdField}>
              <Text style={styles.thirdLabel}>进度：</Text>
              <Text style={styles.thirdValue}>{progressPercent}%</Text>
            </View>
          </View>
          {/* 进度条 */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* 课程明细表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>课程明细</Text>
          <View style={styles.table}>
            {/* 表头 */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.col1]}>课程名称</Text>
              <Text style={[styles.tableHeaderCell, styles.col2]}>类型</Text>
              <Text style={[styles.tableHeaderCell, styles.col3]}>阶段</Text>
              <Text style={[styles.tableHeaderCell, styles.col4]}>课时</Text>
              <Text style={[styles.tableHeaderCell, styles.col5]}>进度</Text>
              <Text style={[styles.tableHeaderCell, styles.col6]}>状态</Text>
            </View>
            {/* 数据行 */}
            {data.courses.map((course, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>{course.courseName}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{course.courseType}</Text>
                <Text style={[styles.tableCell, styles.col3]}>{course.courseStage}</Text>
                <Text style={[styles.tableCell, styles.col4]}>
                  {course.completedHours}/{course.plannedHours}
                </Text>
                <Text style={[styles.tableCell, styles.col5]}>
                  {course.plannedHours > 0 ? Math.round((course.completedHours / course.plannedHours) * 100) : 0}%
                </Text>
                <Text style={[styles.tableCell, styles.col6]}>{course.status}</Text>
              </View>
            ))}
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
          <Text style={styles.signatureTitle}>签字确认</Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>规划顾问签字：</Text>
              <View style={styles.signatureBox}>
                {data.consultantSignature ? (
                  <Text style={styles.signedText}>
                    ✓ 已签字 ({data.consultantSignatureTime})
                  </Text>
                ) : (
                  <Text style={{ color: '#9ca3af', fontSize: 9 }}>待签字</Text>
                )}
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
            1. 请仔细核对选课内容，确认无误后签字{'\n'}
            2. 课程安排可能会根据实际情况进行调整，如有变动将及时通知{'\n'}
            3. 如有疑问，请联系规划顾问或教务老师
          </Text>
        </View>

        {/* 页脚 */}
        <View style={styles.footer}>
          <Text>选课单编号：{data.formId}</Text>
          <Text>生成时间：{new Date().toLocaleString('zh-CN')}</Text>
          <Text>ARTiCO 教务管理系统</Text>
        </View>
      </Page>
    </Document>
  );
};
