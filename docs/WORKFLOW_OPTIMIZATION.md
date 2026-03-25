# 工作流系统优化方向

## 一、当前状态总结

### 已实现功能
- ✅ 4个工作流定义（学生入学、选课单处理、课程进度、申请跟踪）
- ✅ 工作流实例创建和管理
- ✅ 任务状态更新和进度自动计算
- ✅ 看板视图和列表视图
- ✅ 阶段时间线展示

### 数据库支持
- ✅ 完整的工作流表结构
- ✅ 阶段定义和任务模板
- ✅ 实例和任务实例表

---

## 二、可优化方向

### 🔴 P0 - 高优先级（核心功能缺失）

#### 1. 自动触发机制

**问题**: 创建学生时没有自动创建入学流程工作流实例

**当前状态**:
```typescript
// src/lib/db-service.ts - createStudent()
// 只创建学生记录，没有创建工作流实例
const [student] = await db.insert(students).values({...}).returning();
```

**建议方案**:
```typescript
// 创建学生后自动触发入学流程
export async function createStudent(data: CreateStudentRequest) {
  // 1. 创建学生
  const student = await db.insert(students).values({...}).returning();
  
  // 2. 自动创建入学流程工作流实例
  const workflowInstance = await createWorkflowInstance({
    workflowType: 'student_onboarding',
    entityType: 'student',
    entityId: student.id,
    entityName: student.name,
  });
  
  // 3. 发送通知给规划顾问
  await sendNotification({
    type: 'new_student',
    data: { student, workflowId: workflowInstance.id },
  });
  
  return student;
}
```

**涉及文件**:
- `src/lib/db-service.ts` - createStudent()
- `src/app/api/students/route.ts`
- `src/app/api/selection-forms/route.ts` - 创建选课单时触发

---

#### 2. 阶段自动推进

**问题**: 阶段所有任务完成后没有自动推进到下一阶段

**当前状态**:
- 任务完成后只更新进度百分比
- currentStageId 不会自动更新

**建议方案**:
```typescript
// src/app/api/workflows/tasks/[taskId]/route.ts
async function updateWorkflowProgress(instanceId: string) {
  // ... 计算进度
  
  // 检查当前阶段是否全部完成
  const currentStageTasks = await getCurrentStageTasks(instanceId);
  const allCompleted = currentStageTasks.every(t => t.status === 'completed');
  
  if (allCompleted) {
    // 自动推进到下一阶段
    const nextStage = await getNextStage(instanceId);
    if (nextStage) {
      await db.update(workflowInstances)
        .set({ 
          currentStageId: nextStage.id,
          status: 'in_progress',
        })
        .where(eq(workflowInstances.id, instanceId));
      
      // 发送阶段变更通知
      await sendStageChangeNotification(instanceId, nextStage);
    } else {
      // 没有下一阶段，标记工作流完成
      await db.update(workflowInstances)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(workflowInstances.id, instanceId));
    }
  }
}
```

---

#### 3. 与其他模块联动

**问题**: 上课记录完成后没有自动更新选课单进度

**当前状态**:
- 上课记录独立存在
- 选课单进度需要手动更新

**建议方案**:
```typescript
// src/app/api/class-records/route.ts - POST
// 创建上课记录后自动更新进度
export async function POST(request: NextRequest) {
  const record = await createClassRecord(body);
  
  // 自动更新选课单进度
  if (record.selectionItemId) {
    await updateSelectionItemProgress(record.selectionItemId, record.actualDuration);
  }
  
  // 更新工作流任务状态
  await completeWorkflowTask(record.studentId, '填写上课记录');
  
  return NextResponse.json(record, { status: 201 });
}
```

**联动点**:
- 上课记录 → 更新选课单进度
- 学生签字 → 完成签字任务
- 排课确认 → 完成排课任务

---

### 🟡 P1 - 中优先级（用户体验提升）

#### 4. 权限控制

**问题**: 当前所有人都可以操作所有任务

**建议方案**:
```typescript
// 任务操作权限检查
const TASK_PERMISSIONS = {
  '规划顾问': ['预约选课指导课', '进行选课指导', '创建选课单', ...],
  '全职导师': ['规划课程明细', '开始第一节课', '填写上课记录', ...],
  '学生': ['设置学生可用时间', '确认签字', ...],
  '管理员': ['确认缴费信息', '分配规划顾问', '执行自动排课', ...],
};

// API中检查权限
export async function PUT(request: NextRequest, { params }) {
  const user = await getCurrentUser();
  const task = await getTask(params.taskId);
  
  if (!canOperateTask(user.role, task.name)) {
    return NextResponse.json({ error: '无权限操作此任务' }, { status: 403 });
  }
  
  // ... 执行更新
}
```

---

#### 5. 任务跳转链接

**问题**: 点击任务只能勾选完成，不能跳转到对应功能页面

**建议方案**:
```typescript
// 定义任务与页面的映射
const TASK_ROUTES: Record<string, string> = {
  '录入学生基本信息': '/students/new',
  '创建选课单': '/selection-forms/new?studentId={entityId}',
  '添加目标院校': '/students/{entityId}?tab=schools',
  '规划课程明细': '/selection-forms/{formId}',
  '设置学生可用时间': '/time-table/student?studentId={entityId}',
  '执行自动排课': '/schedules?autoRun=true',
  '填写上课记录': '/class-records/new?scheduleId={scheduleId}',
  // ...
};

// 前端组件
<div className="flex items-center gap-3">
  <Checkbox ... />
  <Link href={getTaskRoute(task, instance)} className="flex-1 hover:text-orange-600">
    {task.name}
  </Link>
  {task.assigneeRole && <Badge>{task.assigneeRole}</Badge>}
</div>
```

---

#### 6. 预估时间展示

**问题**: `estimatedDays` 字段存在但未展示

**建议方案**:
```typescript
// 阶段时间线组件
<div className="flex items-center gap-2">
  <h3>{stage.name}</h3>
  <Badge variant="outline">
    预计 {stage.estimatedDays} 天
  </Badge>
  {stage.actualDays && (
    <span className="text-sm text-gray-500">
      实际 {stage.actualDays} 天
    </span>
  )}
</div>
```

---

### 🟢 P2 - 低优先级（锦上添花）

#### 7. 通知提醒机制

**建议方案**:
```typescript
// 定时任务检查超时任务
async function checkOverdueTasks() {
  const overdueTasks = await db.query.workflowTaskInstances.findMany({
    where: and(
      eq(workflowTaskInstances.status, 'pending'),
      lt(workflowTaskInstances.dueDate, new Date())
    ),
  });
  
  for (const task of overdueTasks) {
    await sendNotification({
      type: 'task_overdue',
      to: task.assigneeId,
      data: { task },
    });
  }
}
```

**触发点**:
- 任务到期前1天提醒
- 任务超时警告
- 阶段完成通知
- 工作流完成通知

---

#### 8. 数据分析统计

**建议方案**:
```typescript
// 新增API: /api/workflows/statistics
interface WorkflowStatistics {
  // 效率统计
  averageCompletionTime: number; // 平均完成时间（天）
  onTimeCompletionRate: number; // 按时完成率
  
  // 瓶颈分析
  bottleneckStages: Array<{
    stageName: string;
    avgDelay: number; // 平均延迟天数
    taskCount: number;
  }>;
  
  // 角色工作量
  roleWorkload: Record<string, {
    pendingTasks: number;
    inProgressTasks: number;
    completedThisMonth: number;
  }>;
  
  // 趋势数据
  monthlyTrend: Array<{
    month: string;
    created: number;
    completed: number;
  }>;
}
```

---

#### 9. 批量操作

**建议方案**:
```typescript
// 批量完成任务
POST /api/workflows/tasks/batch
{
  taskIds: ['task1', 'task2', 'task3'],
  action: 'complete' | 'skip' | 'assign',
  assigneeId?: 'user_id'
}

// 批量创建工作流实例
POST /api/workflows/batch
{
  workflowType: 'student_onboarding',
  entityIds: ['student1', 'student2', 'student3']
}
```

---

#### 10. 任务依赖关系

**建议方案**:
```sql
-- 添加任务依赖表
CREATE TABLE workflow_task_dependencies (
  task_id VARCHAR(36) REFERENCES workflow_task_templates(id),
  depends_on VARCHAR(36) REFERENCES workflow_task_templates(id),
  PRIMARY KEY (task_id, depends_on)
);
```

```typescript
// 任务完成时检查是否有后续任务可以开始
async function checkDependencies(taskId: string) {
  const dependentTasks = await getDependentTasks(taskId);
  for (const depTask of dependentTasks) {
    const allDepsCompleted = await checkAllDependenciesCompleted(depTask.id);
    if (allDepsCompleted) {
      await updateTaskStatus(depTask.id, 'pending'); // 从 blocked 变为 pending
    }
  }
}
```

---

## 三、实施路线图

### 第一阶段（1-2周）
1. ✅ 自动触发机制 - 学生创建时自动创建工作流
2. ✅ 阶段自动推进 - 当前阶段完成后自动进入下一阶段
3. ✅ 任务跳转链接 - 点击任务跳转到对应功能页面

### 第二阶段（2-3周）
4. ⏳ 权限控制 - 根据角色限制任务操作
5. ⏳ 与其他模块联动 - 上课记录自动更新进度
6. ⏳ 预估时间展示 - 显示阶段预估时间

### 第三阶段（持续优化）
7. ⏳ 通知提醒机制 - 任务到期/超时提醒
8. ⏳ 数据分析统计 - 工作流效率报表
9. ⏳ 批量操作 - 批量完成任务/创建实例
10. ⏳ 任务依赖关系 - 任务前置依赖检查

---

## 四、技术债务

### 已发现问题
1. 数据库表结构不一致（order_index vs stage_order/task_order）
2. 任务模板中 assignee_type 和 assignee_role 重复
3. 缺少工作流实例与实体的级联删除
4. 前端组件缺少错误处理和加载状态

### 建议修复
1. 统一使用 stage_order 和 task_order
2. 移除 assignee_type，统一使用 assignee_role
3. 添加 onDelete: 'cascade' 约束
4. 添加 Toast 提示和错误边界
