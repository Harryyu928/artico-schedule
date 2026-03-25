/**
 * PDF 模板索引
 * 统一导出所有 PDF 模板
 */

// 上课记录 PDF
export { ClassRecordPDF, type ClassRecordPDFData } from '../pdf-template';
export { ClassRecordPDF as ClassRecordPDFTemplate } from '../pdf-template';

// 选课单 PDF
export { SelectionFormPDF, type SelectionFormPDFData } from './selection-form-pdf';

// 排课确认单 PDF
export { SchedulePDF, type SchedulePDFData } from './schedule-pdf';

// 时间表 PDF
export { TimetablePDF, type TimetablePDFData } from './timetable-pdf';

// 工作流任务清单 PDF
export { WorkflowPDF, type WorkflowPDFData } from './workflow-pdf';
