# ARTiCO 教务系统 - 企业接入指南

## 一、准备工作清单

### 1.1 需要准备的资源

| 资源 | 说明 | 是否已有 |
|------|------|---------|
| 公司域名 | 如 `artico.com` | ❓ |
| 飞书企业版 | 用于数据存储和登录 | ✅ 已有 |
| 云服务器 或 Vercel账号 | 托管应用 | ❓ |
| Supabase账号 | PostgreSQL数据库 | ❓ |

### 1.2 获取关键配置信息

#### 1.2.1 飞书应用配置（已有）

你已经有了飞书应用：
- App ID: `cli_a94e5f1e32bb5cd1`
- App Secret: `aeEqF674K1TTwi3MlS7B3dWClBUlp77j`
- App Token: `HbztbPxc1a8wT8s47FIcgM9annc`

#### 1.2.2 需要新增的配置

1. **飞书日历ID**
   - 打开飞书 → 日历 → 创建新日历（如"ARTiCO课程日历"）
   - 点击日历设置 → 复制日历ID

2. **飞书群ID（教务群）**
   - 打开飞书教务群 → 设置 → 群信息 → 复制群ID

3. **数据库连接字符串**
   - 注册 [Supabase](https://supabase.com)
   - 创建项目 → Settings → Database → 复制连接字符串

---

## 二、部署方案选择

### 方案A：Vercel + Supabase（推荐，免费起步）

| 优势 | 说明 |
|------|------|
| ✅ 免费 | Hobby计划完全免费 |
| ✅ 简单 | 连接GitHub自动部署 |
| ✅ 快速 | 3分钟完成部署 |
| ✅ HTTPS | 自动SSL证书 |

**费用**：免费（如需更多资源，$20/月起）

### 方案B：云服务器（阿里云/腾讯云）

| 优势 | 说明 |
|------|------|
| ✅ 自主控制 | 完全掌控服务器 |
| ✅ 国内访问 | 速度更快 |
| ✅ 数据安全 | 数据在本地 |

**费用**：约 ¥150-300/月

---

## 三、Vercel 部署步骤（推荐）

### 步骤1：上传代码到 GitHub

```bash
# 在项目目录执行
cd /workspace/projects

# 初始化 git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "feat: ARTiCO教务系统初始版本"

# 关联 GitHub 仓库（需要先在 GitHub 创建仓库）
git remote add origin https://github.com/你的用户名/artico-edu.git

# 推送
git push -u origin main
```

### 步骤2：在 Vercel 导入项目

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 登录
3. 点击 **Add New → Project**
4. 选择你的 GitHub 仓库
5. Framework 选择 **Next.js**

### 步骤3：配置环境变量

在 Vercel 项目设置中添加以下环境变量：

```bash
# ========== 数据库（必填）==========
DATABASE_URL=postgresql://postgres.[密码]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# ========== 飞书集成（必填）==========
FEISHU_ENABLED=true
FEISHU_APP_ID=cli_a94e5f1e32bb5cd1
FEISHU_APP_SECRET=aeEqF674K1TTwi3MlS7B3dWClBUlp77j
FEISHU_APP_TOKEN=HbztbPxc1a8wT8s47FIcgM9annc

# ========== 飞书日历（可选）==========
FEISHU_CALENDAR_ID=你的日历ID

# ========== 教务群（可选）==========
FEISHU_EDUCATION_GROUP_ID=你的群ID

# ========== 多维表格（必填）==========
FEISHU_TABLE_CONSULTANTS=tblikevWbwTsPZHN
FEISHU_TABLE_TEACHERS=tblIXVom9KKRjZZw
FEISHU_TABLE_STUDENTS=tblJMMkDWwwZh2kx
FEISHU_TABLE_COURSES=tblVoea2chwYhOEV
FEISHU_TABLE_SELECTION_FORMS=tblY2bGvnhy7oPBp
FEISHU_TABLE_CLASS_RECORDS=tblRyqhkNIWKUFwF
FEISHU_TABLE_CONTRACTS=tbl50ZNYyfFiLylg
FEISHU_TABLE_APPLICATION_SCHOOLS=tblsNG1gOgieX2y1
FEISHU_TABLE_SCHEDULES=tblYTQNtJw4eG1DH
```

### 步骤4：点击部署

等待 2-3 分钟，部署完成后 Vercel 会分配一个域名：
```
https://artico-edu.vercel.app
```

---

## 四、绑定公司域名

### 步骤1：在 Vercel 添加域名

1. Vercel 项目 → Settings → Domains
2. 输入你的域名，如 `artico.yourcompany.com` 或 `edu.yourcompany.com`
3. 点击 Add

### 步骤2：配置 DNS 解析

在你的域名服务商（阿里云/腾讯云/Cloudflare）添加 DNS 记录：

| 类型 | 名称 | 值 |
|------|------|-----|
| CNAME | artico | cname.vercel-dns.com |

或

| 类型 | 名称 | 值 |
|------|------|-----|
| A | artico | 76.76.21.21 |

### 步骤3：等待生效

DNS 解析需要 5-30 分钟，生效后访问你的域名即可。

---

## 五、飞书应用配置

### 5.1 配置应用主页

1. 进入 [飞书开放平台](https://open.feishu.cn)
2. 选择你的应用
3. 应用功能 → 网页 → 配置：

```
网页名称: ARTiCO教务系统
网页地址: https://artico.你的域名.com
桌面端网页地址: https://artico.你的域名.com
```

4. 发布版本

### 5.2 配置权限

确保应用有以下权限：

| 权限 | 用途 |
|------|------|
| `im:message:send_as_bot` | 发送消息 |
| `calendar:calendar:event` | 日历事件 |
| `bitable:app` | 多维表格读写 |
| `authen:user_info` | 用户信息 |

### 5.3 配置事件订阅（可选）

如需接收飞书事件回调：

```
事件订阅地址: https://artico.你的域名.com/api/feishu/webhook
```

---

## 六、初始化数据

### 6.1 同步飞书多维表格数据

部署完成后，访问：
```
https://artico.你的域名.com/api/feishu/sync
```

系统会自动从飞书多维表格同步数据。

### 6.2 创建管理员账号

首次使用需要创建用户：

```bash
# 在 Supabase SQL Editor 执行
INSERT INTO users (id, username, name, role, email)
VALUES 
  ('admin-001', 'admin', '系统管理员', '管理员', 'admin@artico.com'),
  ('consultant-001', 'consultant1', '张顾问', '规划顾问', 'consultant@artico.com');
```

---

## 七、测试验证

### 7.1 功能测试清单

- [ ] 访问域名，页面正常加载
- [ ] 角色登录功能正常
- [ ] 飞书数据同步成功
- [ ] 导师仪表盘显示正常
- [ ] 上课记录可以创建
- [ ] 日历同步功能正常
- [ ] 群消息推送正常

### 7.2 性能测试

- 页面加载时间 < 3秒
- API 响应时间 < 1秒

---

## 八、日常运维

### 8.1 代码更新

```bash
# 本地修改代码后
git add .
git commit -m "feat: 新功能"
git push

# Vercel 会自动部署
```

### 8.2 查看日志

- Vercel Dashboard → Logs
- 实时查看请求日志和错误

### 8.3 数据备份

- Supabase 自动每日备份
- 也可手动导出数据

---

## 九、常见问题

### Q1: 域名无法访问？

1. 检查 DNS 解析是否正确
2. 等待 DNS 生效（最多 48 小时）
3. 检查 Vercel 项目状态

### Q2: 数据库连接失败？

1. 检查 DATABASE_URL 格式
2. 确保 Supabase 项目未暂停
3. 检查 IP 白名单设置

### Q3: 飞书集成不工作？

1. 检查飞书应用权限
2. 确认 App ID 和 Secret 正确
3. 查看飞书开放平台错误日志

---

## 十、联系支持

遇到问题可以：
1. 查看系统日志
2. 检查飞书开放平台文档
3. 联系技术支持
