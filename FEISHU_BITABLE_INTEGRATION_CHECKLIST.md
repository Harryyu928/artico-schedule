# 飞书多维表格对接准备清单

## 📋 检查时间
检查日期：2025-01-XX

---

## ✅ 已完成准备

### 1. 数据库Schema - 已预留飞书字段

| 表名 | 飞书字段 | 用途 |
|------|----------|------|
| `users` | `feishuOpenId`, `feishuUnionId`, `feishuAccessToken`, `feishuRefreshToken`, `feishuTokenExpiresAt` | 用户飞书登录 |
| `teachers` | `feishuUserId` | 导师飞书ID关联 |
| `scheduleResults` | `feishuEventId` | 排课关联飞书日历事件 |

### 2. 飞书SDK代码 - 已完整实现

| 模块 | 文件路径 | 功能 |
|------|----------|------|
| 核心客户端 | `src/lib/feishu/client.ts` | API调用、Token管理 |
| 多维表格 | `src/lib/feishu/bitable.ts` | 数据同步到多维表格 |
| 日历 | `src/lib/feishu/calendar.ts` | 课程同步到日历 |
| 通知 | `src/lib/feishu/notification.ts` | 消息推送 |
| 飞书登录 | `src/app/api/auth/feishu/route.ts` | 飞书OAuth登录 |

### 3. API接口 - 已预留

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/feishu/status` | GET | 获取飞书集成状态 |
| `/api/feishu/config` | POST | 配置飞书参数 |
| `/api/feishu/sync` | POST | 数据同步 |
| `/api/feishu/notify` | POST | 发送通知 |
| `/api/feishu/webhook` | POST | 飞书事件回调 |
| `/api/feishu/test-message` | POST | 测试消息 |

### 4. 管理页面 - 已实现

- **飞书集成管理页面**: `/feishu`
  - 飞书配置状态显示
  - 数据同步操作
  - 测试消息发送

---

## 🔧 需要准备的环境变量

在 `.env.local` 中添加以下配置：

```bash
# ==================== 飞书集成配置 ====================
# 启用飞书集成
FEISHU_ENABLED=true

# 飞书应用凭证（从飞书开放平台获取）
FEISHU_APP_ID=cli_xxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 多维表格 App Token（从多维表格URL获取）
# URL格式: https://xxx.feishu.cn/base/[APP_TOKEN]?table=tblxxx
FEISHU_APP_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 飞书日历ID（可选，用于课程日历同步）
FEISHU_CALENDAR_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 事件订阅配置（可选，用于接收飞书事件）
FEISHU_ENCRYPT_KEY=
FEISHU_VERIFICATION_TOKEN=

# ==================== 多维表格表ID配置 ====================
# 在飞书多维表格中创建以下数据表后，填入对应的 table_id
FEISHU_TABLE_STUDENTS=tblxxxxxxxx
FEISHU_TABLE_TEACHERS=tblxxxxxxxx
FEISHU_TABLE_COURSES=tblxxxxxxxx
FEISHU_TABLE_SCHEDULES=tblxxxxxxxx
FEISHU_TABLE_CLASS_RECORDS=tblxxxxxxxx
FEISHU_TABLE_SELECTION_FORMS=tblxxxxxxxx
```

---

## 📊 飞书多维表格结构设计

### 1. 学生信息表 (Students)

| 字段名 | 字段类型 | 对应系统字段 | 说明 |
|--------|----------|--------------|------|
| 学号 | 文本 | `studentId` | 主键 |
| 姓名 | 文本 | `name` | |
| 邮箱 | 文本 | `email` | |
| 电话 | 文本 | `phone` | |
| 微信 | 文本 | `wechat` | |
| 专业方向 | 单选 | `major` | 游戏设计/游戏美术/角色设计/3D游戏美术/动画 |
| 申请国家 | 单选 | `applicationCountry` | 美国/英国/加拿大/日本 |
| 当前阶段 | 单选 | `currentStage` | 基础阶段/项目阶段/作品集打磨 |
| 总课时 | 数字 | `totalHours` | |
| 已用课时 | 数字 | `usedHours` | |
| 剩余课时 | 公式 | `总课时 - 已用课时` | 自动计算 |
| 负责顾问 | 文本 | `consultantId` | 关联顾问姓名 |
| 创建时间 | 日期 | `createdAt` | |
| 更新时间 | 日期 | `updatedAt` | |

### 2. 导师信息表 (Teachers)

| 字段名 | 字段类型 | 对应系统字段 | 说明 |
|--------|----------|--------------|------|
| 工号 | 文本 | `teacherId` | 主键 |
| 姓名 | 文本 | `name` | |
| 类型 | 单选 | `teacherType` | 全职/兼职 |
| 可教课程 | 多选 | `teachableCourses` | F-GD/F-TA/F-GA/F-3D/F-AN/P-GD/P-AN/P-GA/P-CA/P-3DGA |
| 最大周课时 | 数字 | `maxWeeklyHours` | |
| 当前周课时 | 数字 | `currentHours` | |
| 邮箱 | 文本 | `email` | |
| 电话 | 文本 | `phone` | |
| 飞书ID | 文本 | `feishuUserId` | 用于消息通知 |
| 简介 | 多行文本 | `bio` | |
| 创建时间 | 日期 | `createdAt` | |
| 更新时间 | 日期 | `updatedAt` | |

### 3. 课程库表 (Courses)

| 字段名 | 字段类型 | 对应系统字段 | 说明 |
|--------|----------|--------------|------|
| 课程编号 | 文本 | `courseId` | 主键 |
| 课程名称 | 文本 | `name` | |
| 类型 | 单选 | `type` | 基础课/项目课 |
| 分类 | 单选 | `category` | F-GD/F-TA/... |
| 时长 | 单选 | `duration` | 4周/5周/1个月/2个月/3个月 |
| 描述 | 多行文本 | `description` | |
| 创建时间 | 日期 | `createdAt` | |
| 更新时间 | 日期 | `updatedAt` | |

### 4. 排课记录表 (Schedules)

| 字段名 | 字段类型 | 对应系统字段 | 说明 |
|--------|----------|--------------|------|
| 课程编号 | 文本 | `scheduleId` | 主键 |
| 学生 | 文本 | `studentId` | 关联学生姓名 |
| 导师 | 文本 | `teacherId` | 关联导师姓名 |
| 课程名称 | 文本 | `courseId` | 关联课程名称 |
| 日期 | 日期 | `date` | |
| 星期 | 单选 | `weekDay` | 周一~周日 |
| 时间段 | 单选 | `timeSlot` | 10:00/13:00/15:00/18:00/20:00 |
| 时长 | 数字 | `hours` | 小时数 |
| 状态 | 单选 | `status` | 待确认/已确认/已完成/取消 |
| 飞书事件ID | 文本 | `feishuEventId` | 关联日历事件 |
| 备注 | 多行文本 | `notes` | |
| 创建时间 | 日期 | `createdAt` | |
| 更新时间 | 日期 | `updatedAt` | |

### 5. 上课记录表 (ClassRecords)

| 字段名 | 字段类型 | 对应系统字段 | 说明 |
|--------|----------|--------------|------|
| 记录ID | 文本 | `recordId` | 主键 |
| 学生姓名 | 文本 | `studentId` | 关联学生 |
| 导师姓名 | 文本 | `teacherId` | 关联导师 |
| 课程名称 | 文本 | `courseId` | 关联课程 |
| 上课日期 | 日期 | `classDate` | |
| 星期 | 单选 | `weekDay` | |
| 开始时间 | 单选 | `startTime` | |
| 结束时间 | 文本 | `endTime` | |
| 实际时长(分钟) | 数字 | `actualDuration` | |
| 上课内容 | 多行文本 | `contentSummary` | |
| 课后作业 | 多行文本 | `homeworkAssigned` | |
| 学生表现 | 多行文本 | `studentPerformance` | |
| 出勤状态 | 单选 | `attendanceStatus` | 已排课/已完成/已取消/学生缺席/补课 |
| 创建时间 | 日期 | `createdAt` | |
| 更新时间 | 日期 | `updatedAt` | |

### 6. 选课单表 (SelectionForms)

| 字段名 | 字段类型 | 对应系统字段 | 说明 |
|--------|----------|--------------|------|
| 选课单ID | 文本 | `formId` | 主键 |
| 学生姓名 | 文本 | `studentId` | 关联学生 |
| 状态 | 单选 | `status` | 草稿/已确认/执行中/已完成/已取消 |
| 总课时 | 数字 | `totalHours` | |
| 备注 | 多行文本 | `notes` | |
| 创建时间 | 日期 | `createdAt` | |
| 更新时间 | 日期 | `updatedAt` | |

---

## 🚀 飞书开放平台配置步骤

### 步骤1：创建飞书应用

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 点击「创建企业自建应用」
3. 填写应用名称：「ARTiCO教务系统」
4. 上传应用图标

### 步骤2：配置应用权限

在「权限管理」中申请以下权限：

#### 用户相关权限
- `contact:user.base:readonly` - 获取用户基本信息
- `contact:user.phone:readonly` - 获取用户手机号

#### 消息相关权限
- `im:message` - 获取与发送单聊、群组消息
- `im:message:send_as_bot` - 以应用身份发消息

#### 日历相关权限
- `calendar:calendar` - 日历
- `calendar:calendar:event` - 日历事件

#### 多维表格权限
- `bitable:app` - 多维表格应用
- `bitable:app:readonly` - 读取多维表格
- `bitable:record` - 管理多维表格记录

### 步骤3：配置事件订阅（可选）

在「事件订阅」中配置：

1. **请求地址**: `https://your-domain.com/api/feishu/webhook`
2. **订阅事件**:
   - `contact.user.created_v3` - 用户创建
   - `contact.user.updated_v3` - 用户更新
   - `im.message.receive_v1` - 接收消息

### 步骤4：创建多维表格

1. 在飞书中创建新多维表格
2. 按照上方结构创建数据表
3. 复制 App Token 和各表 Table ID

### 步骤5：配置应用发布

1. 在「版本管理与发布」中创建版本
2. 申请发布，等待管理员审核
3. 审核通过后，应用即可使用

---

## 📝 代码对接要点

### 1. 同步触发时机

```typescript
// 学生创建/更新后同步
// src/app/api/students/route.ts
import { feishuBitableService } from '@/lib/feishu';

// 创建学生后
const student = await db.insert(students).values(data).returning();
await feishuBitableService.syncStudent(student[0].id);
```

### 2. 排课创建后同步日历

```typescript
// src/app/api/schedule/route.ts
import { feishuCalendarService } from '@/lib/feishu';

// 创建排课后
const schedule = await createSchedule(data);
if (isFeishuEnabled()) {
  const eventId = await feishuCalendarService.createCourseEvent(schedule);
  await updateSchedule(schedule.id, { feishuEventId: eventId });
}
```

### 3. 发送课程提醒

```typescript
// src/lib/notifications.ts
import { feishuNotificationService } from '@/lib/feishu';

// 课程开始前1小时提醒
await feishuNotificationService.sendCourseReminder({
  studentOpenId: student.feishuOpenId,
  teacherOpenId: teacher.feishuUserId,
  courseName: course.name,
  time: `${schedule.date} ${schedule.timeSlot}`,
});
```

---

## ⚠️ 注意事项

### 1. 数据一致性
- 建议以本地数据库为数据源，飞书多维表格为同步目标
- 定期执行全量同步保证数据一致

### 2. 错误处理
- 飞书API调用失败不应阻塞主业务流程
- 记录同步失败的记录，支持重试

### 3. 性能优化
- 批量操作使用 `batchCreateBitableRecords`
- 使用增量同步减少API调用

### 4. 安全配置
- `FEISHU_APP_SECRET` 不要提交到代码仓库
- 使用环境变量管理敏感配置

---

## 📌 接口清单

| 功能 | 接口 | 优先级 |
|------|------|--------|
| 飞书登录 | `/api/auth/feishu` | P0 |
| 数据同步 | `/api/feishu/sync` | P0 |
| 消息通知 | `/api/feishu/notify` | P1 |
| 日历同步 | 自动触发 | P1 |
| 事件回调 | `/api/feishu/webhook` | P2 |

---

## 📅 推荐对接顺序

1. **Day 1**: 配置飞书应用和环境变量
2. **Day 2**: 创建多维表格结构
3. **Day 3**: 实现学生/导师数据同步
4. **Day 4**: 实现排课数据同步
5. **Day 5**: 实现消息通知功能
6. **Day 6**: 实现日历同步功能
7. **Day 7**: 测试和优化

---

## ✅ 检查清单

- [ ] 飞书应用已创建
- [ ] 应用权限已配置
- [ ] 多维表格已创建
- [ ] 环境变量已配置
- [ ] 学生数据同步已测试
- [ ] 导师数据同步已测试
- [ ] 排课数据同步已测试
- [ ] 消息通知已测试
- [ ] 日历同步已测试
- [ ] 错误处理已完善

