# 飞书集成功能优化分析报告

## 📊 当前系统概览

### 已实现功能
- ✅ 学生管理（基本信息、专业方向、课时统计）
- ✅ 导师管理（基本信息、可授课程、周课时限制）
- ✅ 课程库管理（基础课、项目课）
- ✅ 申请院校管理（目标院校、专业、截止日期）
- ✅ 选课单管理（创建、明细、进度追踪）
- ✅ 时间可用性管理（学生和导师的可用时间）
- ✅ 自动排课（基于时间和优先级）
- ✅ 上课记录管理（课后记录、进度更新）
- ✅ 统计数据（基础统计）

### 飞书适配器已预留
- 🔌 多维表格适配器 (FeishuBitableAdapter)
- 🔌 日历适配器 (FeishuCalendarAdapter)
- 🔌 消息适配器 (FeishuMessageAdapter)
- 🔌 用户适配器 (FeishuUserAdapter)

---

## 🚀 飞书集成优化方案

### 一、核心业务优化（高优先级）

#### 1. 自动排课通知系统 ⭐⭐⭐⭐⭐

**业务场景**：
- 排课成功后，自动通知学生和导师
- 课程变更时，实时推送变更通知
- 上课前1小时/1天自动提醒

**飞书能力**：
- 消息推送 API
- 卡片消息（富文本）
- 定时任务 + Webhook

**实现方案**：

```typescript
// 1. 排课成功通知
POST /api/feishu/schedule-notification
{
  "type": "schedule_created",
  "scheduleId": "xxx",
  "studentId": "xxx",
  "teacherId": "xxx"
}

// 飞书卡片消息示例
{
  "msg_type": "interactive",
  "card": {
    "header": {
      "title": { "tag": "plain_text", "content": "📚 新课程安排" },
      "template": "blue"
    },
    "elements": [
      {
        "tag": "div",
        "fields": [
          { "is_short": true, "text": { "tag": "lark_md", "content": "**学生**\n张三" } },
          { "is_short": true, "text": { "tag": "lark_md", "content": "**课程**\n游戏设计基础" } },
          { "is_short": true, "text": { "tag": "lark_md", "content": "**导师**\n李老师" } },
          { "is_short": true, "text": { "tag": "lark_md", "content": "**时间**\n2025-03-25 18:00-20:00" } }
        ]
      },
      {
        "tag": "action",
        "actions": [
          {
            "tag": "button",
            "text": { "tag": "plain_text", "content": "确认参加" },
            "type": "primary",
            "value": { "schedule_id": "xxx" }
          },
          {
            "tag": "button",
            "text": { "tag": "plain_text", "content": "申请调整" },
            "type": "default",
            "value": { "schedule_id": "xxx" }
          }
        ]
      }
    ]
  }
}
```

**优化价值**：
- ⏰ 节约通知时间：自动化通知，无需人工跟进
- 📱 提高触达率：消息直达手机，不会错过
- 🎯 降低缺课率：课前提醒，减少遗忘

**数据表改动**：
```sql
-- 学生和导师表增加飞书 ID 字段
ALTER TABLE students ADD COLUMN feishu_open_id VARCHAR(100);
ALTER TABLE teachers ADD COLUMN feishu_open_id VARCHAR(100);
ALTER TABLE teachers ADD COLUMN feishu_email VARCHAR(100);
```

---

#### 2. 飞书日历同步 ⭐⭐⭐⭐⭐

**业务场景**：
- 排课结果自动创建飞书日历事件
- 学生和导师可在日历中查看所有课程
- 课程变更自动更新日历
- 支持导出到其他日历（Google/Outlook）

**飞书能力**：
- 日历 API
- 日历订阅
- 日历事件管理

**实现方案**：

```typescript
// 排课成功后自动创建日历事件
export async function createCalendarEvent(schedule: ScheduleResult) {
  const student = await getStudent(schedule.studentId);
  const teacher = await getTeacher(schedule.teacherId);
  const course = await getCourse(schedule.courseId);
  
  // 创建导师日历事件
  const teacherEventId = await feishuCalendar.createEvent({
    summary: `【${course.name}】${student.name}`,
    description: `学生: ${student.name}\n课程: ${course.name}\n备注: ${schedule.notes}`,
    start_time: schedule.startTime,
    end_time: schedule.endTime,
    attendees: [
      { open_id: student.feishuOpenId },
      { open_id: teacher.feishuOpenId }
    ],
    reminders: [
      { minutes: 60 }, // 课前1小时提醒
      { minutes: 1440 } // 课前1天提醒
    ]
  });
  
  // 保存事件ID到数据库
  await updateSchedule(schedule.id, {
    feishuEventId: teacherEventId
  });
}
```

**数据表改动**：
```sql
-- 排课结果表增加飞书事件ID
ALTER TABLE schedule_results ADD COLUMN feishu_event_id VARCHAR(100);
```

**优化价值**：
- 📅 统一时间管理：所有课程一目了然
- 🔔 多重提醒：日历自动提醒，降低缺课率
- 🔄 实时同步：变更自动更新，无需手动调整
- 🌐 多平台支持：可导出到其他日历应用

---

#### 3. 上课记录填写提醒 ⭐⭐⭐⭐

**业务场景**：
- 课程结束后，自动提醒导师填写上课记录
- 超过24小时未填写，发送催促通知
- 填写完成后，通知学生和家长查看

**飞书能力**：
- 消息推送 API
- 定时任务
- 卡片消息 + 表单

**实现方案**：

```typescript
// 课程结束后自动发送填写提醒
export async function sendClassRecordReminder(scheduleId: string) {
  const schedule = await getSchedule(scheduleId);
  const teacher = await getTeacher(schedule.teacherId);
  
  // 发送卡片消息，包含快速填写入口
  await feishuMessage.sendCardMessage(teacher.feishuOpenId, {
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": { "tag": "plain_text", "content": "📝 上课记录待填写" },
        "template": "orange"
      },
      "elements": [
        {
          "tag": "div",
          "text": {
            "tag": "lark_md",
            "content": `**学生**: ${schedule.student.name}\n**课程**: ${schedule.course.name}\n**时间**: ${schedule.date} ${schedule.timeSlot}`
          }
        },
        {
          "tag": "action",
          "actions": [
            {
              "tag": "button",
              "text": { "tag": "plain_text", "content": "立即填写" },
              "type": "primary",
              "url": `https://your-domain.com/class-records/new?scheduleId=${scheduleId}`
            }
          ]
        }
      ]
    }
  });
}

// 定时任务：每2小时检查未填写的记录
cron.schedule('0 */2 * * *', async () => {
  const unrecordedSchedules = await getUnrecordedSchedules();
  for (const schedule of unrecordedSchedules) {
    await sendClassRecordReminder(schedule.id);
  }
});
```

**优化价值**：
- ✅ 提高填写率：自动提醒，不会遗忘
- ⏱️ 节约时间：卡片直接跳转填写页面
- 📊 数据完整：确保所有课程都有记录

---

#### 4. 选课单审批流程 ⭐⭐⭐⭐

**业务场景**：
- 学生创建选课单后，需要导师或管理员审批
- 审批通过后，自动进入排课流程
- 审批拒绝，退回给学生修改

**飞书能力**：
- 审批流程 API
- 审批实例管理
- 审批通知

**实现方案**：

```typescript
// 创建选课单审批
export async function createSelectionFormApproval(formId: string) {
  const form = await getSelectionForm(formId);
  const student = await getStudent(form.studentId);
  const teacher = await getTeacher(form.consultationTeacherId);
  
  // 调用飞书审批API
  const approvalInstanceId = await feishuApproval.createInstance({
    approval_code: 'selection_form_approval', // 预先定义的审批定义code
    form: {
      student_name: student.name,
      student_id: student.studentId,
      total_hours: form.totalPlannedHours,
      estimated_period: `${form.estimatedStartDate} ~ ${form.estimatedEndDate}`,
      courses: form.items.map(item => ({
        name: item.course.name,
        hours: item.plannedHours,
        type: item.courseType
      }))
    },
    approvers: [
      { open_id: teacher.feishuOpenId } // 导师审批
    ]
  });
  
  // 保存审批实例ID
  await updateSelectionForm(formId, {
    feishuApprovalId: approvalInstanceId,
    status: 'pending_approval'
  });
}

// 审批回调处理
export async function handleApprovalCallback(callback: ApprovalCallback) {
  const formId = callback.form_id;
  const status = callback.status; // approved / rejected
  
  if (status === 'approved') {
    // 审批通过，更新状态并准备排课
    await updateSelectionForm(formId, { status: '已确认' });
    await notifyStudent(formId, '选课单已通过审批');
    await autoSchedule(formId); // 自动触发排课
  } else {
    // 审批拒绝，退回给学生修改
    await updateSelectionForm(formId, { status: '草稿' });
    await notifyStudent(formId, '选课单未通过审批，请修改后重新提交');
  }
}
```

**数据表改动**：
```sql
-- 选课单表增加审批字段
ALTER TABLE course_selection_forms ADD COLUMN feishu_approval_id VARCHAR(100);
ALTER TABLE course_selection_forms ADD COLUMN approval_status VARCHAR(50);
```

**优化价值**：
- ✅ 规范流程：确保选课单经过审核
- 🔄 自动流转：审批通过自动进入排课
- 📝 记录留存：所有审批记录可追溯

---

#### 5. 学生请假管理 ⭐⭐⭐⭐

**业务场景**：
- 学生通过飞书申请请假
- 导师收到请假申请并审批
- 审批通过后，自动调整排课

**飞书能力**：
- 审批流程 API
- 日历事件修改
- 消息通知

**实现方案**：

```typescript
// 学生发起请假
export async function createLeaveRequest(studentId: string, data: LeaveRequest) {
  const student = await getStudent(studentId);
  
  // 创建请假审批
  const approvalId = await feishuApproval.createInstance({
    approval_code: 'student_leave',
    form: {
      student_name: student.name,
      leave_type: data.type, // 病假/事假
      start_time: data.startTime,
      end_time: data.endTime,
      reason: data.reason
    },
    approvers: [
      { open_id: student.consultationTeacher.feishuOpenId }
    ]
  });
  
  // 保存请假记录
  await createLeaveRecord({
    studentId,
    type: data.type,
    startTime: data.startTime,
    endTime: data.endTime,
    reason: data.reason,
    feishuApprovalId: approvalId
  });
}

// 请假审批通过后，调整排课
export async function handleLeaveApproval(approvalId: string, approved: boolean) {
  if (!approved) return;
  
  const leaveRecord = await getLeaveRecordByApprovalId(approvalId);
  
  // 查找受影响的课程
  const affectedSchedules = await getSchedulesInRange(
    leaveRecord.studentId,
    leaveRecord.startTime,
    leaveRecord.endTime
  );
  
  // 取消或调整课程
  for (const schedule of affectedSchedules) {
    await cancelSchedule(schedule.id, '学生请假');
    await feishuCalendar.deleteEvent(schedule.feishuEventId);
    await notifyTeacher(schedule.teacherId, {
      message: `学生 ${schedule.student.name} 请假，原定 ${schedule.date} 的课程已取消`
    });
  }
}
```

**新增数据表**：
```sql
-- 请假记录表
CREATE TABLE leave_records (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES students(id),
  type VARCHAR(20), -- 病假/事假
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  reason TEXT,
  status VARCHAR(20), -- 待审批/已通过/已拒绝
  feishu_approval_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**优化价值**：
- 📱 便捷申请：学生在飞书中直接申请
- ⚡ 快速响应：导师实时收到审批请求
- 🔄 自动调整：审批通过自动调整排课

---

### 二、数据管理优化（中优先级）

#### 6. 多维表格数据同步 ⭐⭐⭐⭐

**业务场景**：
- 学生、导师、课程等基础数据同步到飞书多维表格
- 支持在飞书中查看和编辑数据
- 双向同步，保持数据一致性

**飞书能力**：
- 多维表格 API
- 数据视图
- 协作编辑

**实现方案**：

```typescript
// 初始化多维表格结构
export async function initFeishuBitables() {
  // 学生数据表
  const studentTableId = await feishuBitable.createTable({
    name: '学生信息',
    fields: [
      { field_name: '学生编号', type: 'text' },
      { field_name: '姓名', type: 'text' },
      { field_name: '专业方向', type: 'singleSelect' },
      { field_name: '申请国家', type: 'singleSelect' },
      { field_name: '当前阶段', type: 'singleSelect' },
      { field_name: '总课时', type: 'number' },
      { field_name: '已用课时', type: 'number' },
      { field_name: '剩余课时', type: 'formula', property: { formula: '{总课时}-{已用课时}' } }
    ]
  });
  
  // 导师数据表
  const teacherTableId = await feishuBitable.createTable({
    name: '导师信息',
    fields: [
      { field_name: '导师编号', type: 'text' },
      { field_name: '姓名', type: 'text' },
      { field_name: '可授课程', type: 'multiSelect' },
      { field_name: '周最大课时', type: 'number' },
      { field_name: '当前课时', type: 'number' },
      { field_name: '飞书ID', type: 'text' }
    ]
  });
  
  // 排课记录表
  const scheduleTableId = await feishuBitable.createTable({
    name: '排课记录',
    fields: [
      { field_name: '课程编号', type: 'text' },
      { field_name: '学生', type: 'text', property: { link_table_id: studentTableId } },
      { field_name: '导师', type: 'text', property: { link_table_id: teacherTableId } },
      { field_name: '课程名称', type: 'text' },
      { field_name: '日期', type: 'date' },
      { field_name: '时间段', type: 'singleSelect' },
      { field_name: '时长', type: 'number' },
      { field_name: '状态', type: 'singleSelect' }
    ]
  });
  
  return { studentTableId, teacherTableId, scheduleTableId };
}

// 同步学生数据
export async function syncStudentToFeishu(studentId: string) {
  const student = await getStudent(studentId);
  
  await feishuBitable.createRecord('student_table_id', {
    '学生编号': student.studentId,
    '姓名': student.name,
    '专业方向': student.major,
    '申请国家': student.applicationCountry,
    '当前阶段': student.currentStage,
    '总课时': student.totalHours,
    '已用课时': student.usedHours
  });
}
```

**优化价值**：
- 📊 可视化管理：多维表格提供丰富的视图
- 👥 多人协作：团队成员可以共同维护数据
- 📱 移动访问：随时随地查看数据
- 🔍 高级筛选：支持复杂的筛选和排序

---

#### 7. 学习进度报告生成 ⭐⭐⭐⭐

**业务场景**：
- 定期生成学生学习进度报告
- 推送给学生和家长
- 支持导出PDF

**飞书能力**：
- 文档 API
- 模板渲染
- 消息推送

**实现方案**：

```typescript
// 生成学习进度报告
export async function generateProgressReport(studentId: string, period: 'weekly' | 'monthly') {
  const student = await getStudent(studentId);
  const courses = await getStudentCourses(studentId);
  const records = await getClassRecords(studentId, period);
  
  // 使用飞书文档模板创建报告
  const docId = await feishuDoc.createFromTemplate('progress_report_template', {
    student_name: student.name,
    report_period: period === 'weekly' ? '本周' : '本月',
    generated_date: new Date().toLocaleDateString(),
    
    // 课程进度汇总
    total_courses: courses.length,
    completed_courses: courses.filter(c => c.status === '已完成').length,
    total_hours: records.reduce((sum, r) => sum + r.actualDuration, 0),
    
    // 课程详细进度
    course_progress: courses.map(course => ({
      name: course.name,
      planned_hours: course.plannedHours,
      completed_hours: course.completedHours,
      progress: Math.round(course.completedHours / course.plannedHours * 100)
    })),
    
    // 上课记录摘要
    class_records: records.map(record => ({
      date: record.classDate,
      course: record.courseName,
      duration: record.actualDuration,
      summary: record.contentSummary,
      performance: record.studentPerformance
    }))
  });
  
  // 推送文档给学生和家长
  await feishuMessage.sendCardMessage(student.feishuOpenId, {
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": { "tag": "plain_text", "content": `📊 ${period === 'weekly' ? '本周' : '本月'}学习报告` },
        "template": "green"
      },
      "elements": [
        {
          "tag": "div",
          "text": {
            "tag": "lark_md",
            "content": `**学生**: ${student.name}\n**已完成课时**: ${records.reduce((sum, r) => sum + r.actualDuration, 0)} 小时\n**课程进度**: ${courses.filter(c => c.status === '已完成').length}/${courses.length} 门`
          }
        },
        {
          "tag": "action",
          "actions": [
            {
              "tag": "button",
              "text": { "tag": "plain_text", "content": "查看完整报告" },
              "type": "primary",
              "url": `https://feishu.cn/docx/${docId}`
            }
          ]
        }
      ]
    }
  });
  
  return docId;
}
```

**优化价值**：
- 📈 可视化进度：学生和家长清晰了解学习情况
- ⏰ 定期推送：自动生成和推送，无需人工干预
- 📄 专业格式：飞书文档提供专业的排版

---

#### 8. 导师工作统计 ⭐⭐⭐

**业务场景**：
- 统计导师每周/每月的课时量
- 分析导师的教学质量（学生评价）
- 为导师绩效考核提供数据支持

**飞书能力**：
- 多维表格
- 数据仪表盘
- 消息推送

**实现方案**：

```typescript
// 生成导师工作统计
export async function generateTeacherStatistics(teacherId: string, period: 'weekly' | 'monthly') {
  const teacher = await getTeacher(teacherId);
  const schedules = await getTeacherSchedules(teacherId, period);
  const records = await getTeacherClassRecords(teacherId, period);
  
  const stats = {
    totalHours: schedules.reduce((sum, s) => sum + s.hours, 0),
    completedHours: records.reduce((sum, r) => sum + r.actualDuration, 0),
    totalStudents: new Set(schedules.map(s => s.studentId)).size,
    totalCourses: schedules.length,
    averagePerformance: calculateAveragePerformance(records),
    studentFeedbacks: records.map(r => r.studentPerformance)
  };
  
  // 推送统计报告给导师
  await feishuMessage.sendCardMessage(teacher.feishuOpenId, {
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": { "tag": "plain_text", "content": `📊 ${period === 'weekly' ? '本周' : '本月'}工作统计` },
        "template": "blue"
      },
      "elements": [
        {
          "tag": "div",
          "fields": [
            { "is_short": true, "text": { "tag": "lark_md", "content": `**总课时**\n${stats.totalHours} 小时` } },
            { "is_short": true, "text": { "tag": "lark_md", "content": `**已完成**\n${stats.completedHours} 小时` } },
            { "is_short": true, "text": { "tag": "lark_md", "content": `**学生数**\n${stats.totalStudents} 人` } },
            { "is_short": true, "text": { "tag": "lark_md", "content": `**课程数**\n${stats.totalCourses} 节` } }
          ]
        }
      ]
    }
  });
  
  return stats;
}
```

**优化价值**：
- 📊 数据驱动：基于数据做决策
- 💰 绩效考核：为导师考核提供客观依据
- 📈 趋势分析：了解导师工作趋势

---

### 三、用户体验优化（中优先级）

#### 9. 飞书机器人交互 ⭐⭐⭐⭐

**业务场景**：
- 学生通过飞书机器人查询课程安排
- 导师通过机器人查看今日课程
- 管理员通过机器人获取统计数据

**飞书能力**：
- 机器人 API
- 消息处理
- 指令解析

**实现方案**：

```typescript
// 飞书机器人消息处理
export async function handleBotMessage(event: BotMessageEvent) {
  const { message } = event;
  const userId = message.open_id;
  const content = message.content;
  
  // 解析指令
  const command = parseCommand(content);
  
  switch (command.type) {
    case 'today':
      // 查询今日课程
      const todaySchedules = await getTodaySchedules(userId);
      await replyWithSchedules(message.message_id, todaySchedules);
      break;
      
    case 'progress':
      // 查询学习进度
      const progress = await getStudentProgress(userId);
      await replyWithProgress(message.message_id, progress);
      break;
      
    case 'statistics':
      // 查询统计数据（管理员）
      if (await isAdmin(userId)) {
        const stats = await getSystemStatistics();
        await replyWithStatistics(message.message_id, stats);
      }
      break;
      
    case 'help':
      // 显示帮助信息
      await replyWithHelp(message.message_id);
      break;
  }
}

// 回复今日课程
async function replyWithSchedules(messageId: string, schedules: Schedule[]) {
  await feishuMessage.reply(messageId, {
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": { "tag": "plain_text", "content": "📅 今日课程安排" },
        "template": "blue"
      },
      "elements": schedules.length > 0 ? schedules.map(schedule => ({
        "tag": "div",
        "text": {
          "tag": "lark_md",
          "content": `**${schedule.timeSlot}**\n课程: ${schedule.course.name}\n学生: ${schedule.student.name}\n状态: ${schedule.status}`
        }
      })) : [{
        "tag": "div",
        "text": {
          "tag": "plain_text",
          "content": "今天没有课程安排"
        }
      }]
    }
  });
}
```

**支持的指令**：
- `今日课程` / `today` - 查询今日课程安排
- `本周课程` / `week` - 查询本周课程安排
- `学习进度` / `progress` - 查询学习进度
- `请假` / `leave` - 发起请假申请
- `统计` / `stats` - 查询统计数据（管理员）
- `帮助` / `help` - 显示帮助信息

**优化价值**：
- 💬 便捷交互：无需打开系统，在飞书中直接查询
- ⚡ 快速响应：机器人实时响应
- 🎯 提高效率：常用操作无需登录系统

---

#### 10. 课程评价反馈系统 ⭐⭐⭐

**业务场景**：
- 每节课结束后，学生可对课程进行评价
- 评价内容包括：教学质量、课程难度、收获程度
- 评价结果汇总后推送给导师

**飞书能力**：
- 表单 API
- 消息推送
- 数据统计

**实现方案**：

```typescript
// 课程结束后发送评价邀请
export async function sendCourseEvaluation(scheduleId: string) {
  const schedule = await getSchedule(scheduleId);
  
  await feishuMessage.sendCardMessage(schedule.student.feishuOpenId, {
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": { "tag": "plain_text", "content": "📝 请对本次课程进行评价" },
        "template": "turquoise"
      },
      "elements": [
        {
          "tag": "div",
          "text": {
            "tag": "lark_md",
            "content": `**课程**: ${schedule.course.name}\n**导师**: ${schedule.teacher.name}\n**时间**: ${schedule.date}`
          }
        },
        {
          "tag": "action",
          "actions": [
            {
              "tag": "button",
              "text": { "tag": "plain_text", "content": "开始评价" },
              "type": "primary",
              "url": `https://your-domain.com/evaluation?scheduleId=${scheduleId}`
            }
          ]
        }
      ]
    }
  });
}

// 提交评价后推送给导师
export async function handleEvaluationSubmission(evaluation: CourseEvaluation) {
  const schedule = await getSchedule(evaluation.scheduleId);
  
  // 保存评价
  await saveEvaluation(evaluation);
  
  // 推送给导师
  await feishuMessage.sendCardMessage(schedule.teacher.feishuOpenId, {
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": { "tag": "plain_text", "content": "⭐ 收到新的课程评价" },
        "template": "yellow"
      },
      "elements": [
        {
          "tag": "div",
          "text": {
            "tag": "lark_md",
            "content": `**学生**: ${schedule.student.name}\n**课程**: ${schedule.course.name}\n**评分**: ${'⭐'.repeat(evaluation.rating)}`
          }
        },
        {
          "tag": "div",
          "text": {
            "tag": "plain_text",
            "content": evaluation.comment
          }
        }
      ]
    }
  });
}
```

**新增数据表**：
```sql
-- 课程评价表
CREATE TABLE course_evaluations (
  id VARCHAR(36) PRIMARY KEY,
  schedule_id VARCHAR(36) REFERENCES schedule_results(id),
  student_id VARCHAR(36) REFERENCES students(id),
  teacher_id VARCHAR(36) REFERENCES teachers(id),
  rating INTEGER, -- 1-5星
  teaching_quality INTEGER, -- 教学质量评分
  difficulty INTEGER, -- 课程难度评分
  gain INTEGER, -- 收获程度评分
  comment TEXT, -- 文字评价
  created_at TIMESTAMP DEFAULT NOW()
);
```

**优化价值**：
- ⭐ 收集反馈：及时了解学生对课程的感受
- 📊 数据分析：为导师改进教学提供依据
- 🎯 提升质量：通过反馈持续提升教学质量

---

#### 11. 家长通知系统 ⭐⭐⭐

**业务场景**：
- 定期向家长推送学生学习进度
- 重要事件通知（缺课、请假、进度预警）
- 家长会通知

**飞书能力**：
- 消息推送
- 卡片消息
- 文档分享

**实现方案**：

```typescript
// 家长数据表
export const parents = pgTable('parents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: varchar('student_id', { length: 36 }).references(() => students.id),
  name: varchar('name', { length: 100 }),
  relationship: varchar('relationship', { length: 20 }), // 父亲/母亲/其他
  phone: varchar('phone', { length: 20 }),
  feishuOpenId: varchar('feishu_open_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow()
});

// 发送家长通知
export async function sendParentNotification(studentId: string, type: string, data: any) {
  const parents = await getStudentParents(studentId);
  
  for (const parent of parents) {
    if (parent.feishuOpenId) {
      await feishuMessage.sendCardMessage(parent.feishuOpenId, {
        "msg_type": "interactive",
        "card": generateNotificationCard(type, data)
      });
    }
  }
}

// 进度预警通知
export async function checkProgressAlert(studentId: string) {
  const progress = await getStudentProgress(studentId);
  
  if (progress.completionRate < 0.3 && progress.daysLeft < 30) {
    await sendParentNotification(studentId, 'progress_alert', {
      studentName: progress.studentName,
      completionRate: progress.completionRate,
      daysLeft: progress.daysLeft,
      message: '课程进度较慢，可能无法按时完成'
    });
  }
}
```

**优化价值**：
- 👨‍👩‍👧 家校沟通：保持家长了解学生学习情况
- ⚠️ 及时预警：及时通知异常情况
- 🤝 共同关注：促进家校共同关注学生成长

---

### 四、高级功能优化（低优先级）

#### 12. 作业提交与批改 ⭐⭐⭐

**业务场景**：
- 导师布置作业
- 学生提交作业（文件/链接）
- 导师批改并反馈

**飞书能力**：
- 文件上传
- 云文档
- 消息通知

**实现方案**：

```typescript
// 导师布置作业
export async function assignHomework(scheduleId: string, homework: Homework) {
  const schedule = await getSchedule(scheduleId);
  
  // 保存作业
  const homeworkId = await saveHomework({
    scheduleId,
    teacherId: schedule.teacherId,
    studentId: schedule.studentId,
    title: homework.title,
    description: homework.description,
    deadline: homework.deadline,
    attachments: homework.attachments
  });
  
  // 通知学生
  await feishuMessage.sendCardMessage(schedule.student.feishuOpenId, {
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": { "tag": "plain_text", "content": "📝 新作业" },
        "template": "purple"
      },
      "elements": [
        {
          "tag": "div",
          "text": {
            "tag": "lark_md",
            "content": `**课程**: ${schedule.course.name}\n**标题**: ${homework.title}\n**截止时间**: ${homework.deadline}`
          }
        },
        {
          "tag": "action",
          "actions": [
            {
              "tag": "button",
              "text": { "tag": "plain_text", "content": "提交作业" },
              "type": "primary",
              "url": `https://your-domain.com/homework/${homeworkId}`
            }
          ]
        }
      ]
    }
  });
}

// 学生提交作业
export async function submitHomework(homeworkId: string, submission: HomeworkSubmission) {
  const homework = await getHomework(homeworkId);
  
  // 保存提交
  await updateHomework(homeworkId, {
    submission: submission.files,
    submittedAt: new Date(),
    status: 'submitted'
  });
  
  // 通知导师
  await feishuMessage.sendCardMessage(homework.teacher.feishuOpenId, {
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": { "tag": "plain_text", "content": "📦 收到作业提交" },
        "template": "green"
      },
      "elements": [
        {
          "tag": "div",
          "text": {
            "tag": "lark_md",
            "content": `**学生**: ${homework.student.name}\n**作业**: ${homework.title}`
          }
        },
        {
          "tag": "action",
          "actions": [
            {
              "tag": "button",
              "text": { "tag": "plain_text", "content": "批改作业" },
              "type": "primary",
              "url": `https://your-domain.com/homework/${homeworkId}/grade`
            }
          ]
        }
      ]
    }
  });
}
```

**新增数据表**：
```sql
-- 作业表
CREATE TABLE homework (
  id VARCHAR(36) PRIMARY KEY,
  schedule_id VARCHAR(36) REFERENCES schedule_results(id),
  teacher_id VARCHAR(36) REFERENCES teachers(id),
  student_id VARCHAR(36) REFERENCES students(id),
  title VARCHAR(200),
  description TEXT,
  deadline TIMESTAMP,
  attachments JSONB,
  submission JSONB,
  submitted_at TIMESTAMP,
  grade INTEGER,
  feedback TEXT,
  status VARCHAR(20), -- assigned/submitted/graded
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### 13. 考勤打卡系统 ⭐⭐

**业务场景**：
- 学生和导师上课前打卡签到
- 自动记录考勤情况
- 缺课自动通知

**飞书能力**：
- 二维码 API
- 地理位置API
- 消息通知

**实现方案**：

```typescript
// 生成课程打卡二维码
export async function generateAttendanceQRCode(scheduleId: string) {
  const schedule = await getSchedule(scheduleId);
  
  // 生成二维码
  const qrCode = await feishuQRCode.create({
    type: 'attendance',
    data: {
      scheduleId,
      date: schedule.date,
      time: schedule.timeSlot
    },
    expire_seconds: 3600 // 1小时有效
  });
  
  return qrCode.url;
}

// 处理打卡
export async function handleAttendanceCheckIn(scheduleId: string, userId: string, userType: 'student' | 'teacher') {
  const schedule = await getSchedule(scheduleId);
  const now = new Date();
  const classTime = parseTimeSlot(schedule.timeSlot);
  
  // 判断是否迟到
  const isLate = now > classTime;
  
  // 记录考勤
  await saveAttendance({
    scheduleId,
    userId,
    userType,
    checkInTime: now,
    isLate,
    status: isLate ? 'late' : 'on_time'
  });
  
  // 如果学生未打卡且已超过上课时间15分钟
  if (userType === 'teacher' && now > classTime.add(15, 'minutes')) {
    const studentAttendance = await getStudentAttendance(scheduleId);
    if (!studentAttendance) {
      // 通知管理员和学生
      await notifyAbsence(schedule);
    }
  }
}
```

**优化价值**：
- ✅ 自动考勤：无需人工记录
- 📊 数据统计：自动生成考勤报表
- ⚠️ 及时预警：缺课及时通知

---

#### 14. 智能客服机器人 ⭐⭐

**业务场景**：
- 自动回答常见问题
- 引导学生查询课程信息
- 收集问题和反馈

**飞书能力**：
- 机器人 API
- NLP 能力（可选）
- 知识库

**实现方案**：

```typescript
// 智能客服机器人
const faqKnowledge = {
  '如何请假': '您可以在飞书中发送"请假"指令，或联系您的导师进行请假申请。',
  '如何查看课程安排': '发送"今日课程"或"本周课程"指令即可查看您的课程安排。',
  '如何查看学习进度': '发送"学习进度"指令，系统会为您展示当前的学习进度报告。',
  '课时不够了怎么办': '请联系您的导师或教务老师进行课时充值。',
  '想换导师怎么办': '请与教务老师联系，我们会根据您的需求进行调整。'
};

export async function handleCustomerService(message: BotMessageEvent) {
  const question = message.content;
  
  // 匹配知识库
  let answer = faqKnowledge[question];
  
  if (!answer) {
    // 使用模糊匹配
    const matchedKey = Object.keys(faqKnowledge).find(key => 
      question.includes(key) || key.includes(question)
    );
    answer = matchedKey ? faqKnowledge[matchedKey] : null;
  }
  
  if (answer) {
    await feishuMessage.reply(message.message_id, {
      msg_type: 'text',
      content: answer
    });
  } else {
    // 转人工客服
    await feishuMessage.reply(message.message_id, {
      msg_type: 'text',
      content: '抱歉，我无法回答这个问题。已为您转接人工客服，请稍候。'
    });
    await notifyStaff(question, message.open_id);
  }
}
```

---

## 📋 优先级排序与实施建议

### 第一阶段（高优先级）- 核心业务
1. ⭐⭐⭐⭐⭐ **自动排课通知系统** - 提升沟通效率
2. ⭐⭐⭐⭐⭐ **飞书日历同步** - 时间管理核心
3. ⭐⭐⭐⭐ **上课记录填写提醒** - 确保数据完整
4. ⭐⭐⭐⭐ **选课单审批流程** - 规范业务流程
5. ⭐⭐⭐⭐ **学生请假管理** - 完善考勤体系

### 第二阶段（中优先级）- 数据管理
6. ⭐⭐⭐⭐ **多维表格数据同步** - 数据可视化
7. ⭐⭐⭐⭐ **学习进度报告生成** - 自动化报告
8. ⭐⭐⭐⭐ **飞书机器人交互** - 提升用户体验
9. ⭐⭐⭐ **导师工作统计** - 绩效管理
10. ⭐⭐⭐ **家长通知系统** - 家校沟通

### 第三阶段（低优先级）- 增值功能
11. ⭐⭐⭐ **课程评价反馈系统** - 质量提升
12. ⭐⭐⭐ **作业提交与批改** - 教学辅助
13. ⭐⭐ **考勤打卡系统** - 自动化考勤
14. ⭐⭐ **智能客服机器人** - 客户服务

---

## 💰 成本估算

### 飞书 API 费用
- **免费额度**：飞书开放平台提供免费额度，适合中小规模使用
- **企业版**：如需更高配额和高级功能，需购买飞书企业版

### 开发成本估算
| 功能模块 | 预估开发时间 | 复杂度 |
|---------|------------|--------|
| 自动排课通知 | 2-3天 | 中 |
| 日历同步 | 3-4天 | 中高 |
| 上课记录提醒 | 2天 | 低 |
| 选课单审批 | 3-4天 | 中高 |
| 请假管理 | 2-3天 | 中 |
| 多维表格同步 | 4-5天 | 高 |
| 进度报告生成 | 3-4天 | 中 |
| 机器人交互 | 3-4天 | 中 |
| 其他功能 | 10-15天 | 中 |

**总预估**: 30-45个工作日

---

## 🎯 实施建议

### 1. 渐进式接入
- 先实现高优先级功能，快速验证价值
- 根据用户反馈调整后续开发计划

### 2. 数据迁移准备
- 为所有学生和导师创建飞书账号
- 收集并验证飞书 Open ID
- 准备多维表格模板

### 3. 用户培训
- 制作飞书使用指南
- 培训导师使用飞书功能
- 引导学生熟悉机器人交互

### 4. 测试验证
- 在测试环境完整测试所有功能
- 小范围试点运行
- 收集反馈并优化

### 5. 监控与运维
- 设置飞书 API 调用监控
- 建立异常处理机制
- 定期检查同步数据一致性

---

## 📊 预期收益

### 效率提升
- ⏰ 通知时间减少 90%（自动化推送）
- 📝 数据录入时间减少 70%（自动同步）
- 🔄 审批流程加速 50%（飞书审批）

### 用户体验
- 📱 移动端访问便捷性提升
- 💬 实时沟通更顺畅
- 📊 数据可视化更直观

### 管理优化
- 📈 数据统计更全面
- 🎯 决策支持更有力
- 🔍 问题追踪更及时

---

**建议优先实施第一阶段功能，快速验证价值后再推进后续功能。**
