/**
 * 分析Excel文件结构
 */

const XLSX = require('xlsx');

const filePath = '/tmp/artdico_data.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('=== Excel文件分析 ===\n');
console.log('Sheet列表:', workbook.SheetNames.join(', '));
console.log('\n');

// 分析每个sheet
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  if (data.length === 0) {
    console.log(`\n[${sheetName}] - 空表`);
    continue;
  }
  
  const headers = data[0] || [];
  const rowCount = data.length - 1; // 减去标题行
  
  console.log(`\n[${sheetName}]`);
  console.log(`  行数: ${rowCount}`);
  console.log(`  字段数: ${headers.length}`);
  console.log(`  字段列表:`);
  
  headers.forEach((h: string, i: number) => {
    console.log(`    ${i + 1}. ${h}`);
  });
  
  // 显示前2行数据样例
  if (data.length > 1) {
    console.log(`\n  数据样例 (前2行):`);
    for (let i = 1; i <= Math.min(2, data.length - 1); i++) {
      console.log(`  行${i}:`, JSON.stringify(data[i]).substring(0, 200) + '...');
    }
  }
}
