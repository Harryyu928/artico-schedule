# ARTDiCO 教务系统 - 工作流程文档

## 📋 系统概述

ARTDiCO 教务系统是一个完整的教务管理解决方案，涵盖了从学生入学到课程完成的全部流程。

## 🔄 完整工作流程

```
1. 学生入学
   ↓
2. 安排选课指导课
   ↓
3. 创建选课单
   ├─ 录入申请院校信息
   ├─ 勾选需要做的项目课程
   ├─ 勾选需要上的基础课程
   └─ 规划课程时间线
   ↓
4. 学生和导师填写可用时间
   ↓
5. 自动排课
   ├─ 基于选课单进行排课
   ├─ 匹配学生和导师时间
   └─ 生成排课结果
   ↓
6. 导师上课
   ↓
7. 导师填写上课记录
   ├─ 记录上课内容
   ├─ 评价学生表现
   ├─ 布置作业
   └─ 更新课程进度
   ↓
8. 系统自动更新进度
   ├─ 更新选课单明细进度
   ├─ 更新选课单整体进度
   └─ 判断是否需要继续排课
   ↓
9. 循环：根据进度继续排课 → 上课 → 记录
```

## 📊 核心数据表

### 1. 学生表 (students)
存储学生基本信息、专业方向、课时统计等。

### 2. 导师表 (teachers)
存储导师信息、可授课程、周课时限制等。

### 3. 课程库 (courses)
存储所有课程信息，包括基础课和项目课。

### 4. 申请院校表 (application_schools)
记录学生申请的目标院校信息。

### 5. 选课单主表 (course_selection_forms)
**核心文档**，记录学生的整体课程规划：
- 申请院校信息
- 总计划课时
- 预计时间安排
- 整体进度追踪

### 6. 选课单明细表 (course_selection_items)
记录选课单中的每一门课程：
- 课程基本信息
- 计划课时和实际课时
- 课程状态（待排课/排课中/上课中/已完成）
- 优先级
- 项目阶段进度（针对项目课）

### 7. 时间可用性表 (time_availabilities)
记录学生和导师每周的可用时间。

### 8. 排课结果表 (schedule_results)
记录具体的排课安排：
- 学生、导师、课程信息
- 上课日期和时间
- 课程状态

### 9. 上课记录表 (class_records)
导师课后填写的记录：
- 实际上课时长
- 课程内容概述
- 学生表现评价
- 作业布置
- 下节课计划
- 项目阶段（项目课用）

## 🎯 核心功能模块

### 1. 选课单管理

#### 创建选课单
```
POST /api/selection-forms
{
  "student_id": "学生ID",
  "consultation_teacher_id": "选课指导导师ID",
  "estimated_start_date": "2025-01-01",
  "estimated_end_date": "2025-06-30",
  "goals": "学习目标描述"
}
```

#### 添加课程到选课单
```
POST /api/selection-items
{
  "form_id": "选课单ID",
  "course_id": "课程ID",
  "course_type": "基础课",
  "course_stage": "基础",
  "planned_hours": 20,
  "priority": 1,
  "planned_start_date": "2025-01-15",
  "planned_end_date": "2025-02-15"
}
```

#### 更新课程进度
```
PUT /api/selection-items
{
  "item_id": "选课单明细ID",
  "completed_hours": 10,
  "status": "上课中",
  "current_phase": "Modeling",  // 项目课用
  "notes": "学习进度备注"
}
```

### 2. 上课记录管理

#### 创建上课记录
```
POST /api/class-records
{
  "student_id": "学生ID",
  "teacher_id": "导师ID",
  "course_id": "课程ID",
  "selection_item_id": "选课单明细ID",  // 关联选课单
  "class_date": "2025-01-20",
  "start_time": "18:00",
  "actual_duration": 120,  // 分钟
  "content_summary": "本次课程内容概述",
  "attendance_status": "已完成",
  "student_performance": "学生表现评价",
  "homework_assigned": "布置的作业",
  "next_class_plan": "下节课计划",
  "teacher_feedback": "导师反馈",
  "project_phase": "Modeling",  // 项目课用
  "phase_content": "本阶段具体内容"
}
```

### 3. 申请院校管理

#### 添加申请院校
```
POST /api/application-schools
{
  "student_id": "学生ID",
  "school_name": "University of Southern California",
  "country": "美国",
  "major": "Game Design",
  "degree": "硕士",
  "priority": 1,
  "deadline": "2025-12-01"
}
```

### 4. 自动排课

```
POST /api/schedule/auto
{
  "student_ids": ["学生ID数组"],  // 可选
  "teacher_ids": ["导师ID数组"],  // 可选
  "priority_rule": "remaining_hours"  // 优先规则
}
```

## 📈 进度追踪机制

### 自动进度更新
当导师填写上课记录后，系统会自动：
1. 更新关联的选课单明细进度
   - 增加已完成课时
   - 更新课程状态
   - 更新项目阶段（针对项目课）
2. 更新选课单整体进度
   - 已完成课程数
   - 已完成总课时
   - 计算完成率

### 状态流转

#### 选课单状态
```
草稿 → 已确认 → 执行中 → 已完成
                  ↓
              已取消
```

#### 选课单明细状态
```
待排课 → 排课中 → 上课中 → 已完成
              ↓
          已暂停
```

## 🎨 项目课特殊功能

对于项目课程（如游戏设计项目、动画项目等），系统支持：
- 阶段化管理：Concept → Modeling → Texturing → Lighting → Render → Portfolio
- 每个阶段进度追踪
- 阶段内容记录

## 💡 最佳实践

### 1. 选课单创建流程
1. 学生入学后，安排一节选课指导课
2. 导师了解学生目标院校和专业方向
3. 根据目标，在课程库中勾选需要的项目课
4. 评估学生基础，勾选需要的基础课
5. 制定课程时间线和优先级
6. 确认选课单

### 2. 排课策略
- 基础课优先于项目课
- 优先级高的课程优先排课
- 剩余课时多的学生优先排课

### 3. 上课记录填写
- 课后及时填写，不要拖延
- 详细记录课程内容和学生表现
- 明确布置作业和下节课计划
- 项目课要标注当前阶段

## 🔗 API接口总览

### 选课单相关
- `GET /api/selection-forms` - 获取选课单列表
- `POST /api/selection-forms` - 创建选课单
- `GET /api/selection-forms/[id]` - 获取选课单详情
- `PUT /api/selection-forms/[id]` - 更新选课单
- `DELETE /api/selection-forms/[id]` - 删除选课单

### 选课单明细相关
- `GET /api/selection-items` - 获取选课单明细列表
- `POST /api/selection-items` - 添加选课单明细
- `PUT /api/selection-items` - 更新选课单明细进度
- `DELETE /api/selection-items` - 删除选课单明细

### 上课记录相关
- `GET /api/class-records` - 获取上课记录列表
- `POST /api/class-records` - 创建上课记录
- `PUT /api/class-records` - 更新上课记录
- `DELETE /api/class-records` - 删除上课记录

### 申请院校相关
- `GET /api/application-schools` - 获取申请院校列表
- `POST /api/application-schools` - 添加申请院校
- `PUT /api/application-schools` - 更新申请院校
- `DELETE /api/application-schools` - 删除申请院校

## 🚀 下一步开发

### 前端界面（待开发）
- [ ] 选课单管理界面
- [ ] 上课记录填写界面
- [ ] 课程进度可视化
- [ ] 导师工作台
- [ ] 学生学习中心

### 高级功能
- [ ] 基于选课单的智能排课
- [ ] 课程进度预警
- [ ] 学习报告生成
- [ ] 数据统计分析

---

**系统已实现完整的工作流程和数据管理！** 🎉
