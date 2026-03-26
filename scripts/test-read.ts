/**
 * 测试文件读取
 */

const XLSX = require('xlsx');
const fs = require('fs');

const filePath = '/workspace/projects/temp_data.xlsx';

console.log('文件存在:', fs.existsSync(filePath));
console.log('文件大小:', fs.statSync(filePath).size);

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet列表:', workbook.SheetNames);
  
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log('第一条数据:', data[0]);
} catch (error) {
  console.error('读取失败:', error);
}
