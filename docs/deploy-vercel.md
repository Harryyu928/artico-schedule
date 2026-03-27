# ARTiCO 教务系统 - Vercel 部署指南

## 一、准备工作

### 1.1 所需账号

| 服务 | 用途 | 费用 |
|------|------|------|
| [Vercel](https://vercel.com) | 托管 Next.js 应用 | 免费 |
| [Supabase](https://supabase.com) | PostgreSQL 数据库 | 免费额度够用 |
| [GitHub](https://github.com) | 代码仓库 | 免费 |

### 1.2 获取数据库连接字符串

1. 登录 Supabase Dashboard
2. 进入你的项目 → Settings → Database
3. 复制 **Connection string** (URI 格式)
4. 格式类似：`postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

---

## 二、部署步骤

### 步骤 1：上传代码到 GitHub

```bash
# 初始化 git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "feat: ARTiCO教务系统初始版本"

# 关联远程仓库
git remote add origin https://github.com/你的用户名/artico-edu.git

# 推送
git push -u origin main
```

### 步骤 2：在 Vercel 导入项目

1. 登录 [Vercel](https://vercel.com)
2. 点击 **Add New... → Project**
3. 选择 **Import Git Repository**
4. 选择你的 GitHub 仓库
5. Framework Preset 选择 **Next.js**

### 步骤 3：配置环境变量

在 Vercel 项目设置中，添加以下环境变量：

#### 必需变量

```bash
# 数据库
DATABASE_URL=postgresql://postgres:[密码]@db.[项目ID].supabase.co:5432/postgres

# 飞书集成
FEISHU_ENABLED=true
FEISHU_APP_ID=cli_a94e5f1e32bb5cd1
FEISHU_APP_SECRET=aeEqF674K1TTwi3MlS7B3dWClBUlp77j
FEISHU_APP_TOKEN=HbztbPxc1a8wT8s47FIcgM9annc

# 飞书群消息（可选）
FEISHU_EDUCATION_GROUP_ID=oc_xxxxxxxxx

# 多维表格 Table ID
FEISHU_TABLE_CONSULTANTS=tblikevWbwTsPZHN
FEISHU_TABLE_TEACHERS=tblIXVom9KKRjZZw
FEISHU_TABLE_STUDENTS=tblJMMkDWwwZh2kx
FEISHU_TABLE_COURSES=tblVoea2chwYhOEV
FEISHU_TABLE_SELECTION_FORMS=tblY2bGvnhy7oPBp
FEISHU_TABLE_CLASS_RECORDS=tblRyqhkNIWKUFwF
FEISHU_TABLE_CONTRACTS=tbl50ZNYyfFiLylg
FEISHU_TABLE_APPLICATION_SCHOOLS=tblsNG1gOgieX2y1
FEISHU_TABLE_SCHEDULES=tblYTQNtJw4eG1DH

# 对象存储（PDF生成需要）
COZE_BUCKET_ENDPOINT_URL=你的存储端点
COZE_BUCKET_NAME=你的存储桶名称
```

### 步骤 4：部署

1. 点击 **Deploy** 按钮
2. 等待构建完成（约 2-3 分钟）
3. 部署成功后，Vercel 会分配一个域名

---

## 三、部署后配置

### 3.1 运行数据库迁移

首次部署后，需要创建数据库表：

```bash
# 本地执行（需要安装 drizzle-kit）
pnpm drizzle-kit push
```

### 3.2 自定义域名（可选）

1. Vercel 项目 → Settings → Domains
2. 添加你的域名，如 `artico.yourdomain.com`
3. 按提示配置 DNS

### 3.3 飞书应用回调配置

1. 进入 [飞书开放平台](https://open.feishu.cn)
2. 找到你的应用
3. 配置事件订阅地址：
   ```
   https://你的域名/api/feishu/webhook
   ```

---

## 四、环境变量清单

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `FEISHU_ENABLED` | ✅ | 是否启用飞书集成 |
| `FEISHU_APP_ID` | ✅ | 飞书应用 ID |
| `FEISHU_APP_SECRET` | ✅ | 飞书应用密钥 |
| `FEISHU_APP_TOKEN` | ✅ | 多维表格 App Token |
| `FEISHU_EDUCATION_GROUP_ID` | ⭕ | 教务群 ID（课后反馈） |
| `FEISHU_TABLE_*` | ✅ | 各数据表 Table ID |
| `COZE_BUCKET_*` | ⭕ | 对象存储（PDF 生成） |

---

## 五、常见问题

### Q1: 部署失败，提示依赖错误

确保使用 pnpm：
```bash
# Vercel 会自动检测，但可以手动指定
# 在项目根目录创建 .npmrc
echo "shamefully-hoist=true" > .npmrc
```

### Q2: 数据库连接失败

检查 DATABASE_URL 格式，确保：
- 密码中的特殊字符已 URL 编码
- SSL 模式正确（添加 `?sslmode=require`）

### Q3: 飞书消息发送失败

确保飞书应用有以下权限：
- `im:message:send_as_bot`
- `im:chat`

---

## 六、成本估算

| 服务 | 免费额度 | 超出后费用 |
|------|---------|-----------|
| Vercel Hobby | 100GB 带宽/月 | $20/月起 |
| Supabase Free | 500MB 数据库 | $25/月起 |

对于中小规模教务系统，免费额度完全够用。

---

## 七、技术支持

遇到问题可以：
1. 查看 Vercel 部署日志
2. 检查环境变量是否正确
3. 确认数据库连接正常
