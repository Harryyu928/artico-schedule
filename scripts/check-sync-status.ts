/**
 * 检查飞书多维表格数据同步状态
 */

const CONFIG = {
  appId: 'cli_a94e5f1e32bb5cd1',
  appSecret: 'aeEqF674K1TTwi3MlS7B3dWClBUlp77j',
  appToken: 'HbztbPxc1a8wT8s47FIcgM9annc',
  tables: {
    consultants: 'tblikevWbwTsPZHN',
    teachers: 'tblIXVom9KKRjZZw',
    students: 'tblJMMkDWwwZh2kx',
    courses: 'tblVoea2chwYhOEV',
    selectionForms: 'tblY2bGvnhy7oPBp',
    classRecords: 'tblRyqhkNIWKUFwF',
    contracts: 'tbl50ZNYyfFiLylg',
    applicationSchools: 'tblsNG1gOgieX2y1',
    schedules: 'tblYTQNtJw4eG1DH',
  }
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

async function fetchAllRecords(token: string, tableId: string): Promise<any[]> {
  let allRecords: any[] = [];
  let hasMore = true;
  let pageToken: string | undefined;

  while (hasMore) {
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables/${tableId}/records`
    );
    url.searchParams.set('page_size', '500');
    if (pageToken) url.searchParams.set('page_token', pageToken);

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const result = await response.json();
    if (result.code !== 0) {
      console.error(`获取记录失败: ${result.msg}`);
      break;
    }

    allRecords = allRecords.concat(result.data?.items || []);
    hasMore = result.data?.has_more;
    pageToken = result.data?.page_token;
  }

  return allRecords;
}

async function checkSync() {
  console.log('=== 飞书多维表格数据同步检查 ===\n');

  const token = await getAccessToken();
  console.log('✅ 获取访问令牌成功\n');

  // 检查导师表
  console.log('📋 检查导师表...');
  const teachers = await fetchAllRecords(token, CONFIG.tables.teachers);
  console.log(`   飞书导师记录数: ${teachers.length}`);
  if (teachers.length > 0) {
    const sample = teachers[0];
    console.log(`   字段示例: ${Object.keys(sample.fields).join(', ')}`);
    console.log(`   第一条记录: ${JSON.stringify(sample.fields).substring(0, 200)}...`);
  }
  console.log('');

  // 检查学生表
  console.log('📋 检查学生表...');
  const students = await fetchAllRecords(token, CONFIG.tables.students);
  console.log(`   飞书学生记录数: ${students.length}`);
  if (students.length > 0) {
    const sample = students[0];
    console.log(`   字段示例: ${Object.keys(sample.fields).join(', ')}`);
    console.log(`   第一条记录: ${JSON.stringify(sample.fields).substring(0, 200)}...`);
  }
  console.log('');

  // 检查选课单表
  console.log('📋 检查选课单表...');
  const selectionForms = await fetchAllRecords(token, CONFIG.tables.selectionForms);
  console.log(`   飞书选课单记录数: ${selectionForms.length}`);
  if (selectionForms.length > 0) {
    const sample = selectionForms[0];
    console.log(`   字段示例: ${Object.keys(sample.fields).join(', ')}`);
  }
  console.log('');

  // 检查上课记录表
  console.log('📋 检查上课记录表...');
  const classRecords = await fetchAllRecords(token, CONFIG.tables.classRecords);
  console.log(`   飞书上课记录数: ${classRecords.length}`);
  if (classRecords.length > 0) {
    const sample = classRecords[0];
    console.log(`   字段示例: ${Object.keys(sample.fields).join(', ')}`);
  }
  console.log('');

  // 检查课程表
  console.log('📋 检查课程表...');
  const courses = await fetchAllRecords(token, CONFIG.tables.courses);
  console.log(`   飞书课程记录数: ${courses.length}`);
  if (courses.length > 0) {
    const sample = courses[0];
    console.log(`   字段示例: ${Object.keys(sample.fields).join(', ')}`);
  }
  console.log('');

  // 检查合同表
  console.log('📋 检查合同表...');
  const contracts = await fetchAllRecords(token, CONFIG.tables.contracts);
  console.log(`   飞书合同记录数: ${contracts.length}`);
  console.log('');

  // 汇总
  console.log('═══════════════════════════════════════');
  console.log('📊 数据统计汇总');
  console.log('═══════════════════════════════════════');
  console.log(`导师: ${teachers.length} 条`);
  console.log(`学生: ${students.length} 条`);
  console.log(`选课单: ${selectionForms.length} 条`);
  console.log(`上课记录: ${classRecords.length} 条`);
  console.log(`课程: ${courses.length} 条`);
  console.log(`合同: ${contracts.length} 条`);
  console.log('═══════════════════════════════════════');
  
  // 返回数据供后续分析
  return { teachers, students, selectionForms, classRecords, courses };
}

checkSync().catch(console.error);
