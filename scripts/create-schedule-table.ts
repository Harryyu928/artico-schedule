/**
 * 在飞书多维表格中创建排课安排表
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

async function createScheduleTable() {
  console.log('=== 创建排课安排表 ===\n');

  const token = await getAccessToken();
  console.log('✅ 获取访问令牌成功\n');

  // 创建表
  console.log('📋 创建排课安排表...');
  
  const createTableResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table: {
          name: '排课安排',
        },
      }),
    }
  );

  const createTableResult = await createTableResponse.json();
  console.log('创建表响应:', JSON.stringify(createTableResult, null, 2));
  
  if (createTableResult.code !== 0) {
    console.error('❌ 创建表失败:', createTableResult.msg);
    return;
  }

  const tableId = createTableResult.data?.table_id || createTableResult.data?.table?.table_id;
  
  if (!tableId) {
    console.error('❌ 无法获取Table ID');
    return;
  }

  console.log(`\n✅ 表创建成功，Table ID: ${tableId}\n`);

  // 添加字段
  console.log('📝 添加字段...\n');

  const fields = [
    { field_name: '排课编号', type: 1 },
    { field_name: '学生', type: 1 },
    { field_name: '导师', type: 1 },
    { field_name: '课程类别', type: 1 },
    { field_name: '计划日期', type: 5 },
    { field_name: '年份', type: 2 },
    { field_name: '月份', type: 2 },
    { field_name: '星期', type: 1 },
    { field_name: '开始时间', type: 1 },
    { field_name: '时长分钟', type: 2 },
    { 
      field_name: '状态', 
      type: 3,
      property: {
        options: [
          { name: '待确认' },
          { name: '已确认' },
          { name: '已完成' },
          { name: '已取消' },
        ]
      }
    },
    { field_name: '关联选课单', type: 1 },
    { field_name: '关联上课记录', type: 1 },
    { field_name: '备注', type: 1 },
    { field_name: '飞书日历事件ID', type: 1 },
  ];

  for (const field of fields) {
    try {
      const fieldResponse = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables/${tableId}/fields`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ field }),
        }
      );

      const fieldResult = await fieldResponse.json();
      
      if (fieldResult.code === 0) {
        console.log(`  ✅ ${field.field_name}`);
      } else {
        console.log(`  ❌ ${field.field_name}: ${fieldResult.msg}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log(`  ❌ ${field.field_name}: ${error}`);
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('🎉 排课安排表创建完成！');
  console.log('═══════════════════════════════════════');
  console.log(`\n📋 Table ID: ${tableId}`);
  console.log('\n请将此ID添加到 .env.local 文件中：');
  console.log(`FEISHU_TABLE_SCHEDULES=${tableId}`);
}

createScheduleTable().catch(console.error);
