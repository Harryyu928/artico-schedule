/**
 * 飞书API诊断脚本
 */

const CONFIG = {
  appId: 'cli_a94e5f1e32bb5cd1',
  appSecret: 'aeEqF674K1TTwi3MlS7B3dWClBUlp77j',
  appToken: 'HbztbPxc1a8wT8s47FIcgM9annc',
  tableTeachers: 'tblIXVom9KKRjZZw',
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
  console.log('获取令牌结果:', JSON.stringify(data, null, 2));
  return data.tenant_access_token;
}

async function main() {
  console.log('=== 飞书API诊断 ===\n');
  
  const token = await getAccessToken();
  console.log('\n令牌:', token?.substring(0, 20) + '...\n');

  // 测试创建单条记录
  console.log('测试创建单条导师记录...');
  const testRecord = {
    fields: {
      '姓名': '测试导师',
      '导师类型': '全职',
      '合作状态': '合作中',
    }
  };

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables/${CONFIG.tableTeachers}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRecord),
    }
  );

  const result = await response.json();
  console.log('创建记录结果:', JSON.stringify(result, null, 2));

  // 如果失败，检查表格权限
  if (result.code !== 0) {
    console.log('\n=== 可能的原因 ===');
    console.log('1. 多维表格未添加应用为协作者');
    console.log('2. 应用权限未生效（需要重新发布版本）');
    console.log('\n解决方法：');
    console.log('1. 打开多维表格: https://feishu.cn/base/' + CONFIG.appToken);
    console.log('2. 点击右上角「分享」→「添加协作者」');
    console.log('3. 搜索应用名称，添加并赋予「可编辑」权限');
  }
}

main().catch(console.error);
