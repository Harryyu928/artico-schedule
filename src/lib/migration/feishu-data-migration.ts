/**
 * 飞书多维表格数据迁移脚本
 * 
 * 将原飞书多维表格数据迁移到新系统数据库
 */

import * as XLSX from 'xlsx';
import { db } from '@/db';
import { students, teachers, classRecords, courseSelectionForms, consultants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 迁移配置
interface MigrationConfig {
  dryRun: boolean; // 是否仅预演，不实际写入
  batchSize: number; // 批量处理大小
}

// 迁移统计
interface MigrationStats {
  students: { total: number; success: number; failed: number; skipped: number };
  teachers: { total: number; success: number; failed: number; skipped: number };
  classRecords: { total: number; success: number; failed: number; skipped: number };
  selectionForms: { total: number; success: number; failed: number; skipped: number };
  consultants: { total: number; success: number; failed: number; skipped: number };
  errors: Array<{ type: string; row: number; message: string; data?: unknown }>;
}

// 数据映射函数

/**
 * 映射学员状态
 */
function mapStudentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    '在读': '在读',
    '毕业': '毕业',
    '停课': '停课',
    '退学': '停课', // 退学映射为停课
    '测试': '在读', // 测试映射为在读
  };
  return statusMap[status] || '在读';
}

/**
 * 映射学员类别
 */
function mapStudentCategory(category: string): string {
  if (!category) return '其他';
  
  // 处理多选情况，取第一个
  const categories = category.split(',').map(s => s.trim());
  const mainCategory = categories[0];
  
  // 标准化类别名称
  const categoryMap: Record<string, string> = {
    'VIP 3': 'VIP 3',
    'VIP 5': 'VIP 5',
    'VIP 6': 'VIP 6',
    'VIP 7': 'VIP 7',
    'VIP 8': 'VIP 8',
    'VIP 10': 'VIP 10',
    'VIP 12': 'VIP 12',
    'FV-Portfolio作品集（限课时）': 'FV-Portfolio作品集（限课时）',
    'FV-Portfolio作品集（不限课时）': 'FV-Portfolio作品集（不限课时）',
    'FV-Portfolio作品集+文书（限课时）': 'FV-Portfolio作品集+文书（限课时）',
    'FV-Portfolio作品集+文书（不限课时）': 'FV-Portfolio作品集+文书（不限课时）',
    'FV-Portfolio Unlimited作品集（不限课时）': 'FV-Portfolio作品集（不限课时）',
    'FV-Portfolio Unlimited 作品集+文书（不限课时）': 'FV-Portfolio作品集+文书（不限课时）',
    'FV-Portfolio Unlimited 作品集+文书（不限课时）,文书': 'FV-Portfolio作品集+文书（不限课时）',
    'FV-定制课程': 'FV-定制课程',
    '单项目': '单项目',
    '项目代做': '项目代做',
  };
  
  return categoryMap[mainCategory] || '其他';
}

/**
 * 映射课程类别
 */
function mapCourseCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    '基础能力提升课 / Fundamentals': '基础能力提升课',
    '项目一 / Project 1': '项目一',
    '项目二 / Project 2': '项目二',
    '项目三 / Project 3': '项目三',
    '项目四 / Project 4': '项目四',
    '作业辅导课 / Assignment Tutoring': '作业辅导课',
    '课后延时辅导 / After-class Tutoring': '课后延时辅导',
    '面试辅导': '面试辅导',
    '定制课程': '定制课程',
    'Other Project': 'Other Project',
  };
  return categoryMap[category] || category || '其他';
}

/**
 * 映射到课情况
 */
function mapAttendanceStatus(status: string): string {
  if (!status) return '正常';
  if (status.includes('正常')) return '正常';
  if (status.includes('请假')) return '请假';
  if (status.includes('旷课')) return '旷课';
  if (status.includes('迟到')) return '迟到';
  return '正常';
}

/**
 * 映射导师专业方向
 */
function mapMajorDirections(directions: string): string[] {
  if (!directions) return [];
  return directions.split(',').map(d => d.trim()).filter(Boolean);
}

/**
 * 迁移服务类
 */
export class FeishuDataMigrationService {
  private stats: MigrationStats = {
    students: { total: 0, success: 0, failed: 0, skipped: 0 },
    teachers: { total: 0, success: 0, failed: 0, skipped: 0 },
    classRecords: { total: 0, success: 0, failed: 0, skipped: 0 },
    selectionForms: { total: 0, success: 0, failed: 0, skipped: 0 },
    consultants: { total: 0, success: 0, failed: 0, skipped: 0 },
    errors: [],
  };

  // ID映射缓存（旧名称 -> 新ID）
  private studentIdMap: Map<string, string> = new Map();
  private teacherIdMap: Map<string, string> = new Map();
  private consultantIdMap: Map<string, string> = new Map();

  /**
   * 执行完整迁移
   */
  async migrateFromExcel(filePath: string, config: MigrationConfig = { dryRun: false, batchSize: 100 }): Promise<MigrationStats> {
    console.log('[Migration] 开始数据迁移...');
    console.log(`[Migration] 文件路径: ${filePath}`);
    console.log(`[Migration] 配置: dryRun=${config.dryRun}, batchSize=${config.batchSize}`);

    try {
      // 读取Excel文件
      const workbook = XLSX.readFile(filePath);
      console.log(`[Migration] Excel文件读取成功，共 ${workbook.SheetNames.length} 个Sheet`);

      // 按顺序迁移
      // 1. 先迁移顾问
      await this.migrateConsultants(workbook, config);
      
      // 2. 再迁移导师
      await this.migrateTeachers(workbook, config);
      
      // 3. 然后迁移学生
      await this.migrateStudents(workbook, config);
      
      // 4. 迁移选课单
      await this.migrateSelectionForms(workbook, config);
      
      // 5. 最后迁移上课记录
      await this.migrateClassRecords(workbook, config);

      console.log('[Migration] 迁移完成！');
      this.printStats();

      return this.stats;
    } catch (error) {
      console.error('[Migration] 迁移失败:', error);
      this.stats.errors.push({
        type: 'system',
        row: 0,
        message: `系统错误: ${(error as Error).message}`,
      });
      return this.stats;
    }
  }

  /**
   * 迁移顾问数据
   */
  private async migrateConsultants(workbook: XLSX.WorkBook, config: MigrationConfig): Promise<void> {
    console.log('\n[Migration] 开始迁移顾问数据...');
    
    const sheet = workbook.Sheets['顾问信息管理（含服务学生）'];
    if (!sheet) {
      console.log('[Migration] 未找到顾问信息Sheet，跳过');
      return;
    }

    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    const uniqueConsultants = new Map<string, { name: string; username: string }>();

    // 去重
    for (const row of data) {
      const name = String(row['升学规划老师姓名'] || '').split(' - ')[0].trim();
      const username = String(row['用户名'] || '').trim();
      if (name && !uniqueConsultants.has(name)) {
        uniqueConsultants.set(name, { name, username });
      }
    }

    this.stats.consultants.total = uniqueConsultants.size;
    console.log(`[Migration] 发现 ${uniqueConsultants.size} 位唯一顾问`);

    for (const [name, info] of uniqueConsultants) {
      try {
        const id = uuidv4();
        const consultantData = {
          id,
          consultantId: `C${String(this.stats.consultants.success + 1).padStart(4, '0')}`,
          name: info.name,
          level: 'standard' as const,
          feishuUserId: info.username || null,
          isActive: true,
          totalStudents: 0,
          activeStudents: 0,
        };

        if (!config.dryRun) {
          await db.insert(consultants).values(consultantData);
        }

        this.consultantIdMap.set(name, id);
        this.stats.consultants.success++;
      } catch (error) {
        this.stats.consultants.failed++;
        this.stats.errors.push({
          type: 'consultant',
          row: this.stats.consultants.total,
          message: (error as Error).message,
          data: info,
        });
      }
    }
  }

  /**
   * 迁移导师数据
   */
  private async migrateTeachers(workbook: XLSX.WorkBook, config: MigrationConfig): Promise<void> {
    console.log('\n[Migration] 开始迁移导师数据...');
    
    const sheet = workbook.Sheets['教师信息管理'];
    if (!sheet) {
      console.log('[Migration] 未找到教师信息Sheet，跳过');
      return;
    }

    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    this.stats.teachers.total = data.length;
    console.log(`[Migration] 发现 ${data.length} 条导师记录`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const name = String(row['授课导师'] || '').trim();
        if (!name) {
          this.stats.teachers.skipped++;
          continue;
        }

        const id = uuidv4();
        const teacherData: any = {
          id,
          teacherId: `T${String(i + 1).padStart(4, '0')}`,
          name,
          teachableCourses: [],
          teacherType: String(row['就职状态'] || '兼职').includes('全职') ? '全职' : '兼职',
          cooperationStatus: String(row['合作性质'] || '合作中') === '合作中' ? '合作中' : '终止合作',
          employmentStatus: String(row['就职状态'] || '在职') === '在职' ? '在职' : '离职',
          majorDirections: mapMajorDirections(String(row['专业方向'] || '')),
          phone: String(row['联系方式'] || '').trim() || null,
          wechatId: String(row['微信号'] || '').trim() || null,
          meetingLink: String(row['导师会议号'] || '').trim() || null,
          idType: String(row['授课导师-证件类型'] || '').trim() || null,
          idNumber: String(row['授课导师-证件号'] || '').trim() || null,
          bankName: String(row['授课导师-收款银行账户'] || '').trim() || null,
          bankAccount: String(row['授课导师-银行收款账号'] || '').trim() || null,
          contractExpiry: row['兼职合同到期'] ? new Date(row['兼职合同到期'] as string) : null,
          projectCourseCount: Number(row['项目课数量']) || 0,
          settledCount: Number(row['结课数量']) || 0,
          settlementRate: Number(String(row['结课率'] || '0%').replace('%', '')) || 0,
          feishuUserId: String(row['用户名'] || '').trim() || null,
          maxWeeklyHours: String(row['就职状态'] || '').includes('全职') ? 20 : 10,
          currentHours: 0,
        };

        if (!config.dryRun) {
          await db.insert(teachers).values(teacherData);
        }

        this.teacherIdMap.set(name, id);
        this.stats.teachers.success++;
      } catch (error) {
        this.stats.teachers.failed++;
        this.stats.errors.push({
          type: 'teacher',
          row: i + 1,
          message: (error as Error).message,
          data: row,
        });
      }
    }
  }

  /**
   * 迁移学生数据
   */
  private async migrateStudents(workbook: XLSX.WorkBook, config: MigrationConfig): Promise<void> {
    console.log('\n[Migration] 开始迁移学生数据...');
    
    const sheet = workbook.Sheets['学生课时分配信息管理（有了上课记录表之后才有学生名字）'];
    if (!sheet) {
      console.log('[Migration] 未找到学生课时分配Sheet，跳过');
      return;
    }

    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    
    // 按学生姓名聚合
    const studentMap = new Map<string, Record<string, unknown>>();
    for (const row of data) {
      const name = String(row['学生姓名'] || '').trim();
      if (name && !studentMap.has(name)) {
        studentMap.set(name, row);
      }
    }

    this.stats.students.total = studentMap.size;
    console.log(`[Migration] 发现 ${studentMap.size} 位唯一学生`);

    for (const [name, row] of studentMap) {
      try {
        const id = uuidv4();
        const studentData = {
          id,
          studentId: `S${String(this.stats.students.success + 1).padStart(4, '0')}`,
          name,
          studentStatus: mapStudentStatus(String(row['学员状态'] || '在读')) as any,
          studentCategory: mapStudentCategory(String(row['学员类别'] || '')) as any,
          major: '游戏设计' as any, // 默认值
          applicationCountry: '美国' as any, // 默认值
          currentStage: '基础阶段' as any, // 默认值
          totalHours: Number(row['总-课时']) || 0,
          consumedHours: Number(row['总-消耗课时']) || 0,
          remainingHours: Number(row['总-剩余课时']) || 0,
          consultantId: this.consultantIdMap.get(String(row['升学顾问'] || '').split(' - ')[0]) || null,
        };

        if (!config.dryRun) {
          await db.insert(students).values(studentData);
        }

        this.studentIdMap.set(name, id);
        this.stats.students.success++;
      } catch (error) {
        this.stats.students.failed++;
        this.stats.errors.push({
          type: 'student',
          row: this.stats.students.total,
          message: (error as Error).message,
          data: { name, ...row },
        });
      }
    }
  }

  /**
   * 迁移选课单数据
   */
  private async migrateSelectionForms(workbook: XLSX.WorkBook, config: MigrationConfig): Promise<void> {
    console.log('\n[Migration] 开始迁移选课单数据...');
    
    const sheet = workbook.Sheets['选课单信息 - 录入（顾问录入）'];
    if (!sheet) {
      console.log('[Migration] 未找到选课单Sheet，跳过');
      return;
    }

    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    this.stats.selectionForms.total = data.length;
    console.log(`[Migration] 发现 ${data.length} 条选课单记录`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const studentName = String(row['学生姓名（需手动录入）'] || '').trim();
        const studentId = this.studentIdMap.get(studentName);
        
        if (!studentId) {
          this.stats.selectionForms.skipped++;
          continue;
        }

        const id = uuidv4();
        const formData: any = {
          id,
          formId: `F${String(i + 1).padStart(4, '0')}`,
          studentId,
          consultantId: this.consultantIdMap.get(String(row['升学顾问'] || '').split(' - ')[0]) || null,
          status: '已确认' as const,
          totalHours: Number(row['分配课时']) || 0,
          notes: String(row['学生情况备注'] || '').trim() || null,
          // 添加缺少的必填字段
          estimatedStartDate: row['预计开课时间'] ? new Date(row['预计开课时间'] as string).toISOString().split('T')[0] : null,
          estimatedEndDate: row['预计结束时间'] ? new Date(row['预计结束时间'] as string).toISOString().split('T')[0] : null,
        };

        if (!config.dryRun) {
          await db.insert(courseSelectionForms).values(formData);
        }

        this.stats.selectionForms.success++;
      } catch (error) {
        this.stats.selectionForms.failed++;
        this.stats.errors.push({
          type: 'selectionForm',
          row: i + 1,
          message: (error as Error).message,
          data: row,
        });
      }
    }
  }

  /**
   * 迁移上课记录数据
   */
  private async migrateClassRecords(workbook: XLSX.WorkBook, config: MigrationConfig): Promise<void> {
    console.log('\n[Migration] 开始迁移上课记录数据...');
    
    const sheet = workbook.Sheets['上课记录总表（总表，除了教务都别改）'];
    if (!sheet) {
      console.log('[Migration] 未找到上课记录Sheet，跳过');
      return;
    }

    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    this.stats.classRecords.total = data.length;
    console.log(`[Migration] 发现 ${data.length} 条上课记录`);

    // 批量处理
    const batchSize = config.batchSize;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNum = i + j + 1;
        
        try {
          const studentName = String(row['授课学生 Student Name'] || '').trim();
          const teacherName = String(row['授课老师 Tutor Name'] || '').trim();
          
          const studentId = this.studentIdMap.get(studentName);
          const teacherId = this.teacherIdMap.get(teacherName);
          
          if (!studentId || !teacherId) {
            this.stats.classRecords.skipped++;
            continue;
          }

          const classDate = row['授课日期'] ? new Date(row['授课日期'] as string) : new Date();
          const year = Number(row['年份']) || classDate.getFullYear();
          const month = Number(row['月份']) || (classDate.getMonth() + 1);

          const id = uuidv4();
          const recordData: any = {
            id,
            recordId: `R${String(rowNum).padStart(6, '0')}`,
            studentId,
            teacherId,
            courseId: 'default-course-id', // 需要设置默认课程
            courseCategory: mapCourseCategory(String(row['课程类别'] || '')),
            courseContentDetail: String(row['课程内容'] || '').trim() || null,
            classDate: classDate.toISOString().split('T')[0], // 转换为字符串格式
            classYear: year,
            classMonth: month,
            weekDay: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][classDate.getDay() === 0 ? 6 : classDate.getDay() - 1],
            startTime: String(row['实际上课时间'] || '10:00').trim(),
            endTime: String(row['实际下课时间'] || '').trim() || null,
            actualDuration: Math.round((Number(row['单次消耗课时(H)(耗课时间)']) || 2) * 60), // 转换为分钟
            contentSummary: String(row['授课内容细则'] || '').trim() || '',
            homeworkAssigned: String(row['课后作业'] || '').trim() || null,
            homeworkScore: Number(row['作业分数']) || null,
            homeworkCompletionRate: Number(row['上节课作业完成度']) || null,
            lastHomeworkQuality: String(row['上节课作业 品质'] || '').trim() || null,
            remainingHours: Number(row['剩余课时（本阶段课程）'] || 0),
            attendanceStatus: mapAttendanceStatus(String(row['到课情况'] || '')),
            isSettled: String(row['是否已提交结课'] || '').includes('已结'),
            settlementStatus: String(row['是否已提交结课'] || '').includes('已结') ? '已结' : '未结',
            createdBy: this.teacherIdMap.get(teacherName) || 'system',
            teachingMethod: '线上',
          };

          if (!config.dryRun) {
            await db.insert(classRecords).values(recordData);
          }

          this.stats.classRecords.success++;
        } catch (error) {
          this.stats.classRecords.failed++;
          if (this.stats.errors.length < 100) { // 只保留前100个错误
            this.stats.errors.push({
              type: 'classRecord',
              row: rowNum,
              message: (error as Error).message,
              data: { studentName: row['授课学生 Student Name'], teacherName: row['授课老师 Tutor Name'] },
            });
          }
        }
      }

      console.log(`[Migration] 进度: ${Math.min(i + batchSize, data.length)}/${data.length}`);
    }
  }

  /**
   * 打印统计信息
   */
  private printStats(): void {
    console.log('\n========== 迁移统计 ==========');
    console.log(`顾问: 总计 ${this.stats.consultants.total}, 成功 ${this.stats.consultants.success}, 失败 ${this.stats.consultants.failed}, 跳过 ${this.stats.consultants.skipped}`);
    console.log(`导师: 总计 ${this.stats.teachers.total}, 成功 ${this.stats.teachers.success}, 失败 ${this.stats.teachers.failed}, 跳过 ${this.stats.teachers.skipped}`);
    console.log(`学生: 总计 ${this.stats.students.total}, 成功 ${this.stats.students.success}, 失败 ${this.stats.students.failed}, 跳过 ${this.stats.students.skipped}`);
    console.log(`选课单: 总计 ${this.stats.selectionForms.total}, 成功 ${this.stats.selectionForms.success}, 失败 ${this.stats.selectionForms.failed}, 跳过 ${this.stats.selectionForms.skipped}`);
    console.log(`上课记录: 总计 ${this.stats.classRecords.total}, 成功 ${this.stats.classRecords.success}, 失败 ${this.stats.classRecords.failed}, 跳过 ${this.stats.classRecords.skipped}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n错误列表 (前10条):`);
      this.stats.errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] 行${err.row}: ${err.message}`);
      });
      if (this.stats.errors.length > 10) {
        console.log(`  ... 还有 ${this.stats.errors.length - 10} 条错误`);
      }
    }
  }
}

// 导出单例
export const feishuDataMigrationService = new FeishuDataMigrationService();
