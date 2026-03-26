/**
 * 直接执行数据导入脚本
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 环境变量
const COZE_WORKSPACE_PATH = process.env.COZE_WORKSPACE_PATH || '/workspace/projects';
const filePath = path.join(COZE_WORKSPACE_PATH, 'temp_data.xlsx');

console.log('=== 数据导入脚本 ===');
console.log('工作目录:', COZE_WORKSPACE_PATH);
console.log('文件路径:', filePath);
console.log('文件存在:', fs.existsSync(filePath));

if (!fs.existsSync(filePath)) {
  console.error('文件不存在！');
  process.exit(1);
}

// 读取Excel
const workbook = XLSX.readFile(filePath);
console.log('读取成功，Sheet列表:', workbook.SheetNames.slice(0, 5).join(', '), '...');

// 飞书配置
const config = {
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appToken: process.env.FEISHU_APP_TOKEN,
  tableIds: {
    teachers: process.env.FEISHU_TABLE_TEACHERS,
    students: process.env.FEISHU_TABLE_STUDENTS,
    classRecords: process.env.FEISHU_TABLE_CLASS_RECORDS,
  },
};

console.log('\n飞书配置检查:');
console.log('- App ID:', config.appId ? '✅ 已配置' : '❌ 未配置');
console.log('- App Secret:', config.appSecret ? '✅ 已配置' : '❌ 未配置');
console.log('- App Token:', config.appToken ? '✅ 已配置' : '❌ 未配置');
console.log('- 导师表ID:', config.tableIds.teachers || '❌ 未配置');
console.log('- 学生表ID:', config.tableIds.students || '❌ 未配置');
console.log('- 上课记录表ID:', config.tableIds.classRecords || '❌ 未配置');

// 统计数据
const teacherSheet = workbook.Sheets['教师信息管理'];
const studentSheet = workbook.Sheets['学生课时分配信息管理（有了上课记录表之后才有学生名字）'];
const classRecordSheet = workbook.Sheets['上课记录总表（总表，除了教务都别改）'];

console.log('\n数据统计:');
console.log('- 导师数量:', teacherSheet ? XLSX.utils.sheet_to_json(teacherSheet).length : 0);
console.log('- 学生数量:', studentSheet ? XLSX.utils.sheet_to_json(studentSheet).length : 0);
console.log('- 上课记录数量:', classRecordSheet ? XLSX.utils.sheet_to_json(classRecordSheet).length : 0);

// 解析导师数据
if (teacherSheet) {
  const teacherData = XLSX.utils.sheet_to_json(teacherSheet) as any[];
  console.log('\n导师数据样例:');
  console.log(JSON.stringify(teacherData[0], null, 2).substring(0, 500));
}

// 解析学生数据
if (studentSheet) {
  const studentData = XLSX.utils.sheet_to_json(studentSheet) as any[];
  console.log('\n学生数据样例:');
  console.log(JSON.stringify(studentData[0], null, 2).substring(0, 500));
}
