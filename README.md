# ARTDiCO 自动排课系统

## 📋 项目概述

ARTDiCO 自动排课系统是一个专为游戏动画留学作品集机构设计的智能排课解决方案。系统支持：
- 学生选课管理
- 导师时间管理
- 智能自动排课
- 飞书集成（预留接口）

## 🚀 技术栈

- **前端框架**: Next.js 16 (App Router)
- **UI组件**: shadcn/ui + Tailwind CSS
- **数据库**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **语言**: TypeScript 5
- **飞书集成**: 预留接口，待配置

## 📦 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   │   ├── students/         # 学生管理API
│   │   ├── teachers/         # 导师管理API
│   │   ├── courses/          # 课程管理API
│   │   ├── student-courses/  # 学生选课API
│   │   ├── availability/     # 时间可用性API
│   │   ├── schedule/         # 排课API
│   │   └── statistics/       # 统计数据API
│   ├── layout.tsx            # 主布局
│   └── page.tsx              # 首页（仪表盘）
├── components/
│   ├── ui/                   # shadcn/ui 组件
│   └── dashboard/            # 仪表盘组件
├── db/
│   ├── index.ts              # 数据库连接
│   └── schema.ts             # 数据库模型
├── lib/
│   ├── db-service.ts         # 数据库服务层
│   ├── feishu-adapter.ts     # 飞书API适配器（预留）
│   ├── scheduling-engine.ts  # 排课算法引擎
│   └── utils.ts              # 工具函数
└── types/
    └── index.ts              # TypeScript 类型定义

```

## 🗄️ 数据库结构

系统包含6张核心表：

### 1. 学生表
- 学生基本信息
- 专业方向、申请国家
- 课时统计

### 2. 导师表
- 导师基本信息
- 可授课程列表
- 周课时限制

### 3. 课程库
- 课程基本信息
- 课程类型（基础课/项目课）
- 课程分类和周期

### 4. 学生选课表 (student_courses)
- 学生选课记录
- 课时分配
- 排课状态

### 5. 时间可用性表 (time_availabilities)
- 学生和导师的可用时间
- 按星期和时间段管理

### 6. 排课结果表 (schedule_results)
- 排课记录
- 课程状态追踪

## 🧠 核心功能

### 1. 自动排课算法

排课规则：
- ✅ 学生和导师时间必须重合
- ✅ 导师必须能教授该课程
- ✅ 导师每周课时不能超过最大课时
- ✅ 学生同一时间不能有两节课
- ✅ 导师同一时间不能教两节课
- ✅ 优先排剩余课时多的学生

### 2. 飞书集成（预留）

系统预留了完整的飞书API接口：
- 飞书多维表格API
- 飞书日历API
- 飞书机器人通知API

只需配置环境变量即可启用：
```env
FEISHU_ENABLED=true
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_APP_TOKEN=your_app_token
```

## 🎯 API 文档

### 学生管理
- `GET /api/students` - 获取学生列表
- `POST /api/students` - 创建学生
- `GET /api/students/[id]` - 获取学生详情
- `PUT /api/students/[id]` - 更新学生信息
- `DELETE /api/students/[id]` - 删除学生

### 导师管理
- `GET /api/teachers` - 获取导师列表
- `POST /api/teachers` - 创建导师
- `GET /api/teachers/[id]` - 获取导师详情
- `PUT /api/teachers/[id]` - 更新导师信息
- `DELETE /api/teachers/[id]` - 删除导师

### 课程管理
- `GET /api/courses` - 获取课程列表
- `POST /api/courses` - 创建课程

### 选课管理
- `GET /api/student-courses` - 获取选课列表
- `POST /api/student-courses` - 学生选课

### 时间管理
- `GET /api/availability` - 获取时间可用性
- `POST /api/availability` - 设置时间可用性
- `PUT /api/availability` - 批量设置时间可用性

### 排课管理
- `POST /api/schedule/auto` - 执行自动排课

### 统计数据
- `GET /api/statistics` - 获取系统统计数据

## 🔧 环境配置

创建 `.env.local` 文件：

```env
# 数据库配置（Supabase）
DATABASE_URL=your_supabase_database_url
SUPABASE_DB_URL=your_supabase_database_url

# 飞书配置（可选）
FEISHU_ENABLED=false
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_APP_TOKEN=

# 环境标识
NODE_ENV=development
COZE_PROJECT_ENV=DEV
```

## 🚀 快速开始

1. **安装依赖**
```bash
pnpm install
```

2. **配置环境变量**
创建 `.env.local` 文件并填入必要配置

3. **初始化数据库**
```bash
pnpm run db:push
```

4. **启动开发服务器**
```bash
pnpm run dev
```

5. **访问应用**
打开浏览器访问 http://localhost:5000

## 📊 使用流程

### 1. 基础数据准备
1. 添加课程到课程库
2. 添加导师并设置可授课程
3. 添加学生并分配课时

### 2. 时间设置
1. 导师填写每周可授课时间
2. 学生填写每周可上课时间

### 3. 学生选课
1. 学生选择需要上的课程
2. 系统记录选课信息

### 4. 自动排课
1. 点击"一键排课"按钮
2. 系统自动匹配学生和导师时间
3. 生成排课结果

## 🔮 后续扩展

### 即将推出
- [ ] 自动补课功能
- [ ] 课时自动统计
- [ ] 导师利用率统计
- [ ] 学生项目进度管理

### 飞书集成（需配置凭证）
- [ ] 飞书多维表格同步
- [ ] 飞书日历自动创建
- [ ] 飞书机器人通知

## 📝 开发说明

### 数据库迁移
```bash
# 生成迁移文件
pnpm run db:generate

# 执行迁移
pnpm run db:push
```

### 类型检查
```bash
pnpm run ts-check
```

### 代码规范
项目使用 ESLint 进行代码检查：
```bash
pnpm run lint
```

## 🤝 技术支持

如有问题或建议，请联系开发团队。

## 📄 许可证

Copyright © 2025 ARTDiCO. All rights reserved.
