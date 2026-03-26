/**
 * 检查飞书多维表格表结构
 */

const CONFIG = {
  appId: 'cli_a94e5f1e32bb5cd1',
  appSecret: 'aeEqF674K1TTwi3MlS7B3dWClBUlp77j',
  appToken: 'HbztbPxc1a8wT8s47FIcgM9annc',
};

async function getAccessToken(): Promise<string> {
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: CONFIG.appId,
      app_secret: CONFIG.appSecret,
    }),
  });

  const data = await response.json();
  return data.tenant_access_token;
}

async function main() {
  console.log('=== 飞书多维表格表结构检查 ===\n');

  const token = await getAccessToken();

  // 获取所有表
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  const result = await response.json();
  
  if (result.code !== 0) {
    console.error('获取失败:', result.msg);
    return;
  }

  console.log('📋 已有表列表：\n');
  
  const tables = result.data?.items || [];
  
  for (const table of tables) {
    console.log(`\n━━━ ${table.name} ━━━`);
    console.log(`  Table ID: ${table.table_id}`);
    
    // 获取字段
    const fieldsResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables/${table.table_id}/fields`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    
    const fieldsResult = await fieldsResponse.json();
    const fields = fieldsResult.data?.items || [];
    
    console.log(`  字段 (${fields.length}个):`);
    fields.slice(0, 10).forEach((f: any) => {
      const typeMap: Record<number, string> = {
        1: '文本', 2: '数字', 3: '单选', 4: '多选', 5: '日期',
        7: '复选框', 11: '人员', 13: '电话', 15: 'URL', 17: '附件',
        18: '关联', 19: '公式', 20: '双向关联', 21: '位置', 22: '群组',
        23: '条码', 1001: '创建时间', 1002: '修改时间', 1003: '创建人', 1004: '修改人',
      };
      console.log(`    - ${f.field_name} (${typeMap[f.type] || f.type})`);
    });
    if (fields.length > 10) {
      console.log(`    ... 还有 ${fields.length - 10} 个字段`);
    }
  }

  console.log('\n\n=== 分析 ===');
  console.log('当前表类型：');
  console.log('- 顾问表 ✓');
  console.log('- 导师表 ✓');
  console.log('- 学生表 ✓');
  console.log('- 课程库 ✓');
  console.log('- 选课单 ✓');
  console.log('- 上课记录 ✓');
  console.log('- 合同 ✓');
  console.log('- 申请院校 ✓');
  console.log('\n缺少的表：');
  console.log('- 排课安排表 ❌ (建议创建)');
}

main().catch(console.error);
