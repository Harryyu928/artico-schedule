# ARTiCO 教务系统维护指南

## 目录
1. [系统架构概览](#系统架构概览)
2. [日常运维](#日常运维)
3. [模块维护指南](#模块维护指南)
4. [数据维护](#数据维护)
5. [监控与告警](#监控与告警)
6. [故障排查](#故障排查)
7. [功能扩展](#功能扩展)

---

## 系统架构概览

### 技术栈
```
前端: Next.js 16 + React 19 + TypeScript + shadcn/ui
后端: Next.js API Routes
数据库: PostgreSQL (Supabase)
ORM: Drizzle ORM
部署: Coze 云端沙箱
```

### 目录结构
```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API 路由
│   │   ├── auth/           # 认证相关
│   │   ├── dashboard/      # 仪表盘
│   │   ├── time-table/     # 时间表管理
│   │   ├── schedule/       # 排课相关
│   │   ├── users/          # 用户管理
│   │   └── ...
│   ├── page.tsx            # 首页
│   └── ...pages            # 各功能页面
├── components/             # React 组件
│   ├── ui/                 # shadcn/ui 组件
│   ├── dashboard/          # 仪表盘组件
│   └── time-table/         # 时间表组件
├── db/                     # 数据库相关
│   ├── schema.ts           # 表结构定义
│   └── index.ts            # 数据库连接
├── lib/                    # 核心库
│   ├── scheduling-engine.ts # 排课引擎
│   ├── db-service.ts       # 数据库服务
│   ├── feishu-adapter.ts   # 飞书适配器
│   └── notification-service.ts # 通知服务
└── types/                  # TypeScript 类型定义
```

---

## 日常运维

### 1. 服务监控

#### 检查服务状态
```bash
# 检查服务是否运行
curl -I http://localhost:5000

# 检查日志
tail -n 50 /app/work/logs/bypass/app.log
tail -n 50 /app/work/logs/bypass/console.log
```

#### 服务重启
```bash
# 开发环境（自动热更新，无需手动重启）
# 如需完全重启：
pkill -f "next dev"
coze dev > /app/work/logs/bypass/dev.log 2>&1 &

# 生产环境
coze build && coze start
```

### 2. 日志查看

#### 日志文件位置
```
/app/work/logs/bypass/
├── app.log        # 应用日志
├── console.log    # 前端控制台日志
└── dev.log        # 开发服务器日志
```

#### 常用日志命令
```bash
# 查看最近错误
grep -iE "error|exception|warn" /app/work/logs/bypass/app.log | tail -n 20

# 实时监控日志
tail -f /app/work/logs/bypass/app.log

# 按时间筛选
grep "2024-01-15" /app/work/logs/bypass/app.log
```

---

## 模块维护指南

### 1. 用户管理模块

**相关文件：**
```
src/app/api/auth/route.ts           # 认证API
src/app/api/users/route.ts          # 用户列表API
src/app/api/users/[id]/route.ts     # 用户详情API
src/db/schema.ts                    # users 表
```

**常见维护任务：**

```sql
-- 添加新用户
INSERT INTO users (id, name, email, role, password)
VALUES (gen_random_uuid(), '新用户', 'user@example.com', '学生', 'hashed_password');

-- 修改用户角色
UPDATE users SET role = '规划顾问' WHERE id = 'user_id';

-- 重置用户密码（需要配合密码哈希）
UPDATE users SET password = 'new_hashed_password' WHERE email = 'user@example.com';
```

**扩展新角色：**
1. 修改 `src/db/schema.ts` 中的 `userRoleEnum`
2. 更新 `src/types/permissions.ts` 中的权限定义
3. 在 `src/app/api/dashboard/route.ts` 添加新角色的仪表盘逻辑

### 2. 学生管理模块

**相关文件：**
```
src/db/schema.ts                    # students 表
src/app/api/students/               # 学生API（如需创建）
```

**常见维护任务：**

```sql
-- 查看学生列表
SELECT s.id, s.name, s.student_id, s.major, u.role
FROM students s
JOIN users u ON s.id = u.student_id;

-- 更新学生课时
UPDATE students SET total_hours = 100 WHERE id = 'student_id';

-- 查看学生进度
SELECT 
  s.name,
  s.total_hours,
  s.used_hours,
  ROUND((s.used_hours::float / s.total_hours) * 100, 2) as progress
FROM students s;
```

### 3. 导师管理模块

**相关文件：**
```
src/db/schema.ts                    # teachers 表
src/app/api/teachers/               # 导师API（如需创建）
```

**常见维护任务：**

```sql
-- 查看导师课时统计
SELECT 
  t.name,
  t.teacher_type,
  t.current_hours,
  t.max_weekly_hours,
  ROUND((t.current_hours::float / t.max_weekly_hours) * 100, 2) as utilization
FROM teachers t;

-- 重置导师周课时（每周执行）
UPDATE teachers SET current_hours = 0;

-- 更新导师可授课程
UPDATE teachers 
SET teachable_courses = ARRAY['F-GD', 'F-GA', 'P-GD']::course_category[]
WHERE id = 'teacher_id';
```

### 4. 时间表模块

**相关文件：**
```
src/app/api/time-table/student/[studentId]/route.ts
src/app/api/time-table/teacher/[teacherId]/route.ts
src/components/time-table/time-table-editor.tsx
src/app/time-table/student/page.tsx
src/app/time-table/teacher/page.tsx
```

**常见维护任务：**

```sql
-- 查看学生时间表填写状态
SELECT 
  s.name,
  COUNT(t.id) as available_slots,
  CASE 
    WHEN COUNT(t.id) = 0 THEN '未填写'
    WHEN COUNT(t.id) < 5 THEN '部分填写'
    ELSE '已填写'
  END as status
FROM students s
LEFT JOIN time_availabilities t ON s.id = t.user_id AND t.is_available = true
GROUP BY s.id, s.name;

-- 清除学生时间表
DELETE FROM time_availabilities WHERE user_id = 'student_id' AND user_role = '学生';

-- 批量重置时间表（新学期开始）
DELETE FROM time_availabilities WHERE reservation_type = '空闲';
```

**定时任务（建议使用 cron 或外部调度）：**
```typescript
// 每周日 22:00 - 复制导师默认模板到本周
async function copyTeacherTemplates() {
  const teachers = await db.query.teachers.findMany();
  
  for (const teacher of teachers) {
    const template = await db.query.timeAvailabilities.findMany({
      where: and(
        eq(timeAvailabilities.userId, teacher.id),
        eq(timeAvailabilities.notes, 'default_template')
      ),
    });
    
    // 复制到 weekly_schedule
    for (const slot of template) {
      await db.insert(timeAvailabilities).values({
        ...slot,
        id: uuidv4(),
        notes: 'weekly_schedule',
      });
    }
  }
}
```

### 5. 排课模块

**相关文件：**
```
src/lib/scheduling-engine.ts        # 排课引擎
src/app/api/schedule/validate/route.ts  # 排课前校验
src/db/schema.ts                    # schedule_results 表
```

**常见维护任务：**

```sql
-- 查看排课结果
SELECT 
  sr.schedule_id,
  s.name as student_name,
  t.name as teacher_name,
  sr.week_day,
  sr.time_slot,
  sr.status
FROM schedule_results sr
JOIN students s ON sr.student_id = s.id
JOIN teachers t ON sr.teacher_id = t.id
ORDER BY sr.week_day, sr.time_slot;

-- 取消排课
UPDATE schedule_results 
SET status = '取消' 
WHERE schedule_id = 'schedule_id';

-- 查看排课冲突
SELECT 
  sr1.schedule_id as schedule1,
  sr2.schedule_id as schedule2,
  sr1.week_day,
  sr1.time_slot
FROM schedule_results sr1
JOIN schedule_results sr2 ON 
  sr1.teacher_id = sr2.teacher_id AND
  sr1.week_day = sr2.week_day AND
  sr1.time_slot = sr2.time_slot AND
  sr1.id < sr2.id;
```

### 6. 选课单模块

**相关文件：**
```
src/db/schema.ts                    # course_selection_forms 表
src/db/schema.ts                    # course_selection_items 表
```

**常见维护任务：**

```sql
-- 查看待处理选课单
SELECT 
  csf.id,
  s.name as student_name,
  csf.status,
  csf.created_at
FROM course_selection_forms csf
JOIN students s ON csf.student_id = s.id
WHERE csf.status = '已确认'
ORDER BY csf.created_at;

-- 更新选课单状态
UPDATE course_selection_forms 
SET status = '执行中' 
WHERE id = 'form_id';
```

### 7. 上课记录模块

**相关文件：**
```
src/db/schema.ts                    # class_records 表
```

**常见维护任务：**

```sql
-- 查看待填写的上课记录
SELECT 
  cr.id,
  s.name as student_name,
  t.name as teacher_name,
  cr.class_date,
  cr.status
FROM class_records cr
JOIN students s ON cr.student_id = s.id
JOIN teachers t ON cr.teacher_id = t.id
WHERE cr.status = '待填写'
ORDER BY cr.class_date;

-- 批量更新记录状态
UPDATE class_records 
SET status = '已完成' 
WHERE class_date < CURRENT_DATE AND status = '待填写';
```

---

## 数据维护

### 1. 数据备份

#### Supabase 自动备份
Supabase 提供自动备份功能，可在控制台配置：
- 每日自动备份
- 保留 7 天的备份

#### 手动备份
```bash
# 使用 pg_dump
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d).sql

# 只备份特定表
pg_dump -h <host> -U <user> -d <database> -t users -t students -t teachers > backup_core.sql
```

### 2. 数据清理

```sql
-- 清理过期的会话
DELETE FROM sessions WHERE expires_at < NOW();

-- 清理旧的日志数据（如果有日志表）
DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- 归档已完成的排课记录
UPDATE schedule_results 
SET status = '已归档' 
WHERE status = '已完成' AND date < CURRENT_DATE - INTERVAL '30 days';
```

### 3. 数据统计

```sql
-- 系统整体统计
SELECT 
  (SELECT COUNT(*) FROM students) as total_students,
  (SELECT COUNT(*) FROM teachers) as total_teachers,
  (SELECT COUNT(*) FROM courses) as total_courses,
  (SELECT COUNT(*) FROM schedule_results WHERE status = '待确认') as pending_schedules,
  (SELECT COUNT(*) FROM class_records WHERE status = '待填写') as pending_records;

-- 月度新增统计
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as new_students
FROM students
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

---

## 监控与告警

### 1. 关键指标监控

建议监控以下指标：

| 指标 | 说明 | 阈值 |
|------|------|------|
| API 响应时间 | 接口平均响应时间 | > 2s 告警 |
| 错误率 | 5xx 错误占比 | > 1% 告警 |
| 数据库连接数 | 当前连接数 | > 80% 最大连接数告警 |
| 待处理任务 | 待处理选课单/上课记录 | > 50 告警 |

### 2. 自定义监控脚本

```typescript
// scripts/health-check.ts
import { db } from '../src/db';
import { scheduleResults, classRecords, courseSelectionForms } from '../src/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';

async function healthCheck() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: [],
  };

  // 检查待处理排课
  const [pendingSchedules] = await db
    .select({ count: count() })
    .from(scheduleResults)
    .where(eq(scheduleResults.status, '待确认'));
  
  results.checks.push({
    name: 'pending_schedules',
    value: pendingSchedules.count,
    status: pendingSchedules.count > 20 ? 'warning' : 'ok',
  });

  // 检查待填写记录
  const [pendingRecords] = await db
    .select({ count: count() })
    .from(classRecords)
    .where(eq(classRecords.status, '待填写'));
  
  results.checks.push({
    name: 'pending_records',
    value: pendingRecords.count,
    status: pendingRecords.count > 30 ? 'warning' : 'ok',
  });

  console.log(JSON.stringify(results, null, 2));
}

healthCheck();
```

### 3. 飞书告警集成

```typescript
// lib/alert-service.ts
export async function sendAlert(title: string, message: string) {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  
  if (!webhookUrl) return;
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: `⚠️ ${title}` },
          template: 'red',
        },
        elements: [
          {
            tag: 'div',
            text: { tag: 'plain_text', content: message },
          },
          {
            tag: 'div',
            text: { tag: 'plain_text', content: `时间: ${new Date().toLocaleString('zh-CN')}` },
          },
        ],
      },
    }),
  });
}
```

---

## 故障排查

### 1. 常见问题

#### 问题：排课失败
**可能原因：**
- 学生/导师时间表未填写
- 没有匹配的导师
- 时间冲突

**排查步骤：**
```bash
# 1. 调用校验API
curl -X POST http://localhost:5000/api/schedule/validate \
  -H 'Content-Type: application/json' \
  -d '{"selectionFormId": "xxx"}'

# 2. 检查时间表
SELECT * FROM time_availabilities WHERE user_id = 'xxx';

# 3. 检查导师可授课程
SELECT name, teachable_courses FROM teachers WHERE id = 'xxx';
```

#### 问题：登录失败
**可能原因：**
- Cookie 未正确设置
- 用户角色不匹配
- 数据库连接问题

**排查步骤：**
```bash
# 检查用户是否存在
SELECT id, name, email, role FROM users WHERE email = 'xxx@example.com';

# 检查密码是否正确（需要比对哈希）
# 重置密码
UPDATE users SET password = '<new_hashed_password>' WHERE email = 'xxx@example.com';
```

#### 问题：API 返回 500 错误
**排查步骤：**
```bash
# 查看错误日志
tail -n 100 /app/work/logs/bypass/app.log | grep -i error

# 检查数据库连接
curl http://localhost:5000/api/health
```

### 2. 应急处理

```bash
# 重启服务
pkill -f "next" && coze dev > /app/work/logs/bypass/dev.log 2>&1 &

# 清理缓存
rm -rf .next

# 回滚代码
git checkout HEAD~1 -- src/
```

---

## 功能扩展

### 1. 添加新 API 接口

**步骤：**
1. 在 `src/app/api/` 下创建路由文件
2. 实现 GET/POST/PUT/DELETE 方法
3. 添加类型定义到 `src/types/`
4. 更新 API 文档

**示例：**
```typescript
// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { students, scheduleResults } from '@/db/schema';
import { count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const report = await db
    .select({
      major: students.major,
      total: count(),
    })
    .from(students)
    .groupBy(students.major);
  
  return NextResponse.json({ success: true, data: report });
}
```

### 2. 添加新页面

**步骤：**
1. 在 `src/app/` 下创建页面目录
2. 创建 `page.tsx` 文件
3. 在仪表盘添加入口链接

### 3. 添加新组件

**步骤：**
1. 在 `src/components/` 下创建组件文件
2. 使用 shadcn/ui 基础组件
3. 遵循现有命名规范

### 4. 数据库变更

**添加新字段：**
```sql
-- 直接执行 SQL
ALTER TABLE students ADD COLUMN notes TEXT;

-- 或在 schema.ts 中更新后同步
```

**添加新表：**
1. 更新 `src/db/schema.ts`
2. 执行数据库迁移
3. 更新类型定义

---

## 维护清单

### 每日
- [ ] 检查服务状态
- [ ] 查看错误日志
- [ ] 处理待办事项

### 每周
- [ ] 重置导师周课时
- [ ] 检查时间表填写率
- [ ] 清理过期数据

### 每月
- [ ] 数据备份验证
- [ ] 性能分析
- [ ] 功能更新评估

### 每季度
- [ ] 数据库优化
- [ ] 安全审计
- [ ] 功能规划
