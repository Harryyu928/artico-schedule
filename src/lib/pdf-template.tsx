/**
 * 上课记录 PDF 模板
 * 使用 @react-pdf/renderer 生成 PDF
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
  contentBox: {
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    marginBottom: 8,
  },
  contentText: {
    lineHeight: 1.5,
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
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  attachmentItem: {
    width: '30%',
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    alignItems: 'center',
  },
  attachmentIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  attachmentName: {
    fontSize: 8,
    color: '#4b5563',
    textAlign: 'center',
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
  '基础课': '基础课',
  '项目课': '项目课',
};

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

// 上课记录数据类型
export interface ClassRecordPDFData {
  recordId: string;
  studentName: string;
  teacherName: string;
  courseName: string;
  courseCategory?: string;
  courseContentDetail?: string;
  classDate: string;
  weekDay: string;
  startTime: string;
  endTime?: string;
  actualDuration: number;
  contentSummary: string;
  teachingMethod?: string;
  studentPerformance?: string;
  attendanceStatus: string;
  homeworkAssigned?: string;
  homeworkDeadline?: string;
  homeworkCompletionRate?: number;
  lastHomeworkQuality?: string;
  nextClassPlan?: string;
  teacherFeedback?: string;
  studentFeedback?: string;
  projectPhase?: string;
  phaseContent?: string;
  attachments?: string[];
  studentSignature?: string;
  signatureTime?: string;
  signLink?: string;
  qrCodeDataUrl?: string;
}

// PDF 文档组件
export const ClassRecordPDF = ({ data }: { data: ClassRecordPDFData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* 页眉 */}
      <View style={styles.header}>
        <Text style={styles.logo}>ARTiCO</Text>
        <Text style={styles.subtitle}>艺术留学作品集辅导 · 上课记录表</Text>
      </View>

      {/* 标题 */}
      <Text style={styles.title}>上课记录表</Text>

      {/* 基本信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本信息</Text>
        <View style={styles.halfRow}>
          <View style={styles.halfField}>
            <Text style={styles.halfLabel}>学生姓名：</Text>
            <Text style={styles.halfValue}>{data.studentName}</Text>
          </View>
          <View style={styles.halfField}>
            <Text style={styles.halfLabel}>导师姓名：</Text>
            <Text style={styles.halfValue}>{data.teacherName}</Text>
          </View>
        </View>
        <View style={styles.halfRow}>
          <View style={styles.halfField}>
            <Text style={styles.halfLabel}>课程名称：</Text>
            <Text style={styles.halfValue}>{data.courseName}</Text>
          </View>
          <View style={styles.halfField}>
            <Text style={styles.halfLabel}>课程类别：</Text>
            <Text style={styles.halfValue}>
              {data.courseCategory && COURSE_CATEGORY_MAP[data.courseCategory]
                ? COURSE_CATEGORY_MAP[data.courseCategory]
                : data.courseCategory || '-'}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>课程内容：</Text>
          <Text style={styles.value}>{data.courseContentDetail || '-'}</Text>
        </View>
      </View>

      {/* 上课时间 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>上课时间</Text>
        <View style={styles.halfRow}>
          <View style={styles.halfField}>
            <Text style={styles.halfLabel}>上课日期：</Text>
            <Text style={styles.halfValue}>{data.classDate}</Text>
          </View>
          <View style={styles.halfField}>
            <Text style={styles.halfLabel}>星期：</Text>
            <Text style={styles.halfValue}>
              {WEEK_DAY_MAP[data.weekDay] || data.weekDay}
            </Text>
          </View>
        </View>
        <View style={styles.halfRow}>
          <View style={styles.halfField}>
            <Text style={styles.halfLabel}>上课时间：</Text>
            <Text style={styles.halfValue}>
              {data.startTime} - {data.endTime || '结束时间'}
            </Text>
          </View>
          <View style={styles.halfField}>
            <Text style={styles.halfLabel}>实际时长：</Text>
            <Text style={styles.halfValue}>{data.actualDuration} 分钟</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>授课方式：</Text>
          <Text style={styles.value}>{data.teachingMethod || '一对一线上指导'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>出勤状态：</Text>
          <Text style={styles.tag}>{data.attendanceStatus}</Text>
        </View>
      </View>

      {/* 授课内容 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>授课内容</Text>
        <View style={styles.contentBox}>
          <Text style={styles.contentText}>{data.contentSummary}</Text>
        </View>
      </View>

      {/* 学生表现 */}
      {data.studentPerformance && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>学生表现</Text>
          <View style={styles.contentBox}>
            <Text style={styles.contentText}>{data.studentPerformance}</Text>
          </View>
        </View>
      )}

      {/* 作业与反馈 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>作业与反馈</Text>
        {data.lastHomeworkQuality && (
          <View style={styles.row}>
            <Text style={styles.label}>上节课作业品质：</Text>
            <Text style={styles.value}>{data.lastHomeworkQuality}</Text>
          </View>
        )}
        {data.homeworkCompletionRate !== undefined && data.homeworkCompletionRate > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>作业完成度：</Text>
            <Text style={styles.value}>{data.homeworkCompletionRate}%</Text>
          </View>
        )}
        {data.homeworkAssigned && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>课后作业：</Text>
            </View>
            <View style={styles.contentBox}>
              <Text style={styles.contentText}>{data.homeworkAssigned}</Text>
              {data.homeworkDeadline && (
                <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 5 }}>
                  截止日期：{data.homeworkDeadline}
                </Text>
              )}
            </View>
          </>
        )}
        {data.teacherFeedback && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>导师评语：</Text>
            </View>
            <View style={styles.contentBox}>
              <Text style={styles.contentText}>{data.teacherFeedback}</Text>
            </View>
          </>
        )}
      </View>

      {/* 下次课计划 */}
      {data.nextClassPlan && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>下次课计划</Text>
          <View style={styles.contentBox}>
            <Text style={styles.contentText}>{data.nextClassPlan}</Text>
          </View>
        </View>
      )}

      {/* 项目课特有 */}
      {data.projectPhase && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>项目进度</Text>
          <View style={styles.row}>
            <Text style={styles.label}>当前阶段：</Text>
            <Text style={styles.value}>{data.projectPhase}</Text>
          </View>
          {data.phaseContent && (
            <View style={styles.contentBox}>
              <Text style={styles.contentText}>{data.phaseContent}</Text>
            </View>
          )}
        </View>
      )}

      {/* 附件列表 */}
      {data.attachments && data.attachments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>附件 ({data.attachments.length})</Text>
          <View style={styles.attachmentGrid}>
            {data.attachments.map((key, index) => {
              const fileName = key.split('/').pop() || key;
              const displayName = fileName.replace(/^\d+_/, '').substring(0, 15);
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
              const isPdf = fileName.endsWith('.pdf');
              return (
                <View key={index} style={styles.attachmentItem}>
                  <Text style={styles.attachmentIcon}>
                    {isImage ? '🖼️' : isPdf ? '📄' : '📎'}
                  </Text>
                  <Text style={styles.attachmentName}>{displayName}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 学生签字区域 */}
      <View style={styles.signatureArea}>
        <Text style={styles.signatureTitle}>学生签字确认</Text>
        <View style={styles.signatureRow}>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>导师签字：</Text>
            <View style={styles.signatureBox}>
              <Text style={styles.signedText}>已确认</Text>
            </View>
          </View>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>学生签字：</Text>
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
          1. 因个人原因无法上课的，请务必至少48小时告知教务老师{'\n'}
          2. 请导师与学员在课程结束后第一时间完成记录表撰写并签字{'\n'}
          3. 请各位学员在下课后当天及时签署，如若三日内未签署也未提出异议的，视为对课时内容的认可
        </Text>
      </View>

      {/* 页脚 */}
      <View style={styles.footer}>
        <Text>记录编号：{data.recordId}</Text>
        <Text>生成时间：{new Date().toLocaleString('zh-CN')}</Text>
        <Text>ARTiCO 教务管理系统</Text>
      </View>
    </Page>
  </Document>
);
