# 课后反馈自动化流程

## 概述

课后反馈自动化流程实现了上课记录完成后的自动化处理，包括：
1. 自动生成PDF
2. 推送反馈卡片到教务群
3. 支持教务一键转发给学生

## 流程图

```
导师填写上课记录
       ↓
  状态变为"已完成"
       ↓
  触发课后反馈服务
       ↓
  自动生成PDF
       ↓
  推送到教务群
       ↓
  教务转发给学生
```

## 技术实现

### 1. 核心服务

**文件**: `src/lib/class-feedback-service.ts`

**主要功能**:
- `processCompletedRecord()` - 处理上课记录完成后的自动化流程
- `generatePDF()` - 生成PDF并上传到对象存储
- `pushToEducationGroup()` - 推送消息卡片到飞书群
- `buildFeedbackCard()` - 构建飞书消息卡片
- `forwardToStudent()` - 转发给学生

### 2. API端点

**文件**: `src/app/api/class-feedback/route.ts`

**接口**:
- `POST /api/class-feedback` - 触发课后反馈流程
  - 参数: `recordId` - 上课记录ID
  
- `POST /api/class-feedback?action=forward` - 转发给学生
  - 参数: 
    - `recordId` - 上课记录ID
    - `targetType` - 目标类型 (wechat/email/sms)

### 3. 自动触发机制

**文件**: `src/app/api/class-records/[id]/route.ts`

在PUT方法中，当上课记录状态从非"已完成"变为"已完成"时，自动触发课后反馈服务：

```typescript
const isCompleting = body.attendanceStatus === '已完成' && previousStatus !== '已完成';
if (isCompleting) {
  // 1. 更新选课单进度
  // 2. 完成相关工作流任务
  // 3. 触发课后反馈流程（异步执行）
  classFeedbackService.processCompletedRecord(id);
}
```

### 4. 飞书群消息卡片

**消息卡片结构**:
- **标题**: 📝 课后反馈
- **字段**:
  - 学生、导师、课程、时长
  - 上课时间、记录编号
- **内容**:
  - 上课内容摘要
  - 课后作业
  - 导师评语
- **按钮**:
  - 📋 查看详情
  - 📄 下载PDF
  - 📤 转发给学生
- **提示**: 学生联系方式

### 5. 配置项

需要在环境变量中配置：

```bash
# 飞书教务群ID
FEISHU_EDUCATION_GROUP_ID=oc_xxx

# 飞书应用配置（已存在）
FEISHU_APP_ID=xxx
FEISHU_APP_SECRET=xxx
```

## 使用说明

### 自动触发

导师在填写上课记录时，将状态设置为"已完成"，系统会自动：
1. 生成PDF
2. 推送到教务群

### 手动触发

如果需要重新生成PDF或推送消息，可以调用API：

```bash
curl -X POST http://localhost:5000/api/class-feedback \
  -H "Content-Type: application/json" \
  -d '{"recordId": "record-uuid"}'
```

### 转发给学生

```bash
curl -X POST http://localhost:5000/api/class-feedback \
  -H "Content-Type: application/json" \
  -d '{
    "action": "forward",
    "recordId": "record-uuid",
    "targetType": "wechat"
  }'
```

## 注意事项

1. **飞书群权限**: 确保飞书应用有向指定群发送消息的权限
2. **对象存储**: PDF文件会上传到对象存储，确保配置正确
3. **异步执行**: 课后反馈流程是异步执行的，不会阻塞API响应
4. **错误处理**: PDF生成或消息推送失败不会影响上课记录的更新

## 后续优化

1. [ ] 实现微信转发功能
2. [ ] 实现邮件转发功能
3. [ ] 实现短信转发功能
4. [ ] 添加消息推送日志记录
5. [ ] 支持自定义群消息模板
