/**
 * 数据导出工具函数
 * 支持导出 CSV 格式
 */

/**
 * 将数据转换为 CSV 格式
 * @param data 数据数组
 * @param columns 列配置 [{ key: 'name', label: '姓名' }]
 * @returns CSV 字符串
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: Array<{ key: keyof T; label: string }>
): string {
  if (data.length === 0) {
    return '';
  }

  // 表头
  const headers = columns.map((col) => col.label);
  
  // 数据行
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      // 处理特殊字符（逗号、引号、换行）
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      // 如果包含逗号、引号或换行，需要用引号包裹并转义
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * 导出数据为 CSV 文件
 * @param data 数据数组
 * @param columns 列配置
 * @param filename 文件名（不含扩展名）
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: Array<{ key: keyof T; label: string }>,
  filename: string
): void {
  const csv = convertToCSV(data, columns);
  
  // 添加 BOM 以支持中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${formatDate(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 格式化日期为 YYYYMMDD 格式
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 学生数据导出配置
 */
export const studentExportColumns = [
  { key: 'studentId' as const, label: '学生编号' },
  { key: 'name' as const, label: '姓名' },
  { key: 'major' as const, label: '专业方向' },
  { key: 'applicationCountry' as const, label: '申请国家' },
  { key: 'currentStage' as const, label: '当前阶段' },
  { key: 'totalHours' as const, label: '总课时' },
  { key: 'usedHours' as const, label: '已用课时' },
  { key: 'remainingHours' as const, label: '剩余课时' },
  { key: 'consultantName' as const, label: '规划顾问' },
  { key: 'createdAt' as const, label: '创建时间' },
];

/**
 * 导师数据导出配置
 */
export const teacherExportColumns = [
  { key: 'teacherId' as const, label: '导师编号' },
  { key: 'name' as const, label: '姓名' },
  { key: 'teacherType' as const, label: '导师类型' },
  { key: 'subjects' as const, label: '可授课程' },
  { key: 'maxWeeklyHours' as const, label: '周最大课时' },
  { key: 'currentWeekHours' as const, label: '本周课时' },
  { key: 'phone' as const, label: '电话' },
  { key: 'email' as const, label: '邮箱' },
  { key: 'feishuId' as const, label: '飞书ID' },
  { key: 'status' as const, label: '状态' },
  { key: 'createdAt' as const, label: '创建时间' },
];

/**
 * 排课数据导出配置
 */
export const scheduleExportColumns = [
  { key: 'scheduleId' as const, label: '排课编号' },
  { key: 'date' as const, label: '日期' },
  { key: 'weekDay' as const, label: '星期' },
  { key: 'timeSlot' as const, label: '时间段' },
  { key: 'studentName' as const, label: '学生' },
  { key: 'teacherName' as const, label: '导师' },
  { key: 'courseName' as const, label: '课程' },
  { key: 'hours' as const, label: '课时' },
  { key: 'status' as const, label: '状态' },
  { key: 'notes' as const, label: '备注' },
  { key: 'createdAt' as const, label: '创建时间' },
];

/**
 * 上课记录导出配置
 */
export const classRecordExportColumns = [
  { key: 'recordId' as const, label: '记录编号' },
  { key: 'classDate' as const, label: '上课日期' },
  { key: 'studentName' as const, label: '学生' },
  { key: 'teacherName' as const, label: '导师' },
  { key: 'courseName' as const, label: '课程' },
  { key: 'actualDuration' as const, label: '上课时长(分钟)' },
  { key: 'attendanceStatus' as const, label: '状态' },
  { key: 'homeworkCompletionRate' as const, label: '作业完成度' },
  { key: 'lastHomeworkQuality' as const, label: '作业品质' },
  { key: 'studentSignature' as const, label: '学生签字' },
  { key: 'createdAt' as const, label: '创建时间' },
];
