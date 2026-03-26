/**
 * 检查是否有排课相关的表，如果没有则创建
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
  console.log('=== 检查飞书多维表格 ===\n');

  const token = await getAccessToken();

  // 获取所有表
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  const result = await response.json();
  const tables = result.data?.items || [];

  console.log('📋 当前所有表：\n');
  
  let scheduleTableId = null;
  
  tables.forEach((t: any) => {
    const isSchedule = t.name.includes('排课') || t.name.includes('schedule') || t.name.includes('安排');
    console.log(`${isSchedule ? '⭐' : '  '} ${t.name} (ID: ${t.table_id})`);
    if (isSchedule) {
      scheduleTableId = t.table_id;
    }
  });

  if (scheduleTableId) {
    console.log(`\n✅ 已找到排课相关表，Table ID: ${scheduleTableId}`);
    console.log('\n查看字段结构...');
    
    const fieldsResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables/${scheduleTableId}/fields`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    
    const fieldsResult = await fieldsResponse.json();
    const fields = fieldsResult.data?.items || [];
    
    console.log(`\n字段列表 (${fields.length}个)：`);
    fields.forEach((f: any) => {
      console.log(`  - ${f.field_name}`);
    });

    console.log(`\n.env.local 配置：`);
    console.log(`FEISHU_TABLE_SCHEDULES=${scheduleTableId}`);
  } else {
    console.log('\n❌ 未找到排课相关表，需要创建');
    
    // 用新名字创建
    const newTableName = '排课安排表';
    console.log(`\n创建新表：${newTableName}...`);
    
    const createResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: { name: newTableName },
        }),
      }
    );

    const createResult = await createResponse.json();
    console.log('创建结果:', JSON.stringify(createResult, null, 2));
  }
}

main().catch(console.error);
