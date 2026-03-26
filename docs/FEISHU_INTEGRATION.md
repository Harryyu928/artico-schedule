# 飞书多维表格集成方案

## 📋 概述

ARTiCO教务系统以**飞书多维表格为主数据源**，实现：
- ✅ 数据存储在飞书多维表格
- ✅ 应用从飞书读取数据展示
- ✅ 应用写入操作直接写入飞书
- ✅ 飞书变更自动同步到应用

---

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    飞书多维表格                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  导师表   │ │  学生表   │ │上课记录表│ │  选课单表 │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        ┌─────▼─────┐               ┌─────▼─────┐
        │  Webhook  │               │  定时同步  │
        │ 实时监听   │               │ 每小时一次 │
        └─────┬─────┘               └─────┬─────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   ARTiCO 应用                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │              同步服务层                            │   │
│  │  - feishu-sync-service.ts (读取同步)              │   │
│  │  - feishu-write-service.ts (写入操作)             │   │
│  │  - feishu-bitable-service.ts (底层API)            │   │
│  └──────────────────────────────────────────────────┘   │
│                            │                             │
│                            ▼                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │              本地数据库 (缓存)                      │   │
│  │  - 加速查询                                       │   │
│  │  - 复杂关联查询                                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 核心组件

### 1. 同步服务 (`src/lib/feishu-sync-service.ts`)

从飞书多维表格同步数据到本地数据库：

```typescript
// 全量同步
await syncAllFromFeishu();

// 单表同步
await syncTeachersFromFeishu();
await syncStudentsFromFeishu();
await syncClassRecordsFromFeishu();
```

### 2. 写入服务 (`src/lib/feishu-write-service.ts`)

所有数据操作直接写入飞书：

```typescript
// 创建导师
await createTeacherInFeishu({
  name: '王老师',
  type: '全职',
  majorDirections: ['游戏策划', '游戏开发'],
});

// 更新学生
await updateStudentInFeishu(recordId, {
  currentStage: '项目一',
  totalHours: 100,
});

// 创建上课记录
await createClassRecordInFeishu({
  studentName: '张三',
  teacherName: '李老师',
  classDate: new Date(),
  contentSummary: '课程内容...',
});
```

### 3. Webhook监听 (`/api/feishu/webhook`)

接收飞书事件推送，实时同步：

```typescript
// 事件类型
'bitable.record.created'  // 记录创建
'bitable.record.updated'  // 记录更新
'bitable.record.deleted'  // 记录删除
```

### 4. 定时同步 (`/api/feishu/sync`)

- 每1小时自动同步
- 支持手动触发
- 显示同步状态

---

## 📱 用户操作流程

### 在飞书多维表格操作
1. 用户在飞书多维表格中新增/修改/删除数据
2. 飞书推送事件到Webhook
3. 应用自动同步更新本地缓存
4. 用户刷新页面看到最新数据

### 在应用中操作
1. 用户在应用中新增/修改数据
2. 应用直接写入飞书多维表格
3. Webhook触发同步更新本地缓存
4. 数据保持一致

---

## ⚙️ 配置步骤

### 1. 环境变量配置

已在 `.env.local` 中配置：

```env
FEISHU_APP_ID=cli_a94e5f1e32bb5cd1
FEISHU_APP_SECRET=aeEqF674K1TTwi3MlS7B3dWClBUlp77j
FEISHU_APP_TOKEN=HbztbPxc1a8wT8s47FIcgM9annc
FEISHU_TABLE_TEACHERS=tblIXVom9KKRjZZw
FEISHU_TABLE_STUDENTS=tblJMMkDWwwZh2kx
FEISHU_TABLE_CLASS_RECORDS=tblRyqhkNIWKUFwF
# ... 其他表格ID
```

### 2. 飞书开放平台配置

已完成：
- ✅ 创建企业自建应用
- ✅ 开通 `bitable:app` 权限
- ✅ 添加多维表格为文档应用

待配置：
- [ ] 事件订阅（Webhook）

#### 配置Webhook步骤：

1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 选择你的应用 → 事件订阅
3. 添加请求地址：
   ```
   https://你的域名/api/feishu/webhook
   ```
4. 添加事件：
   - `bitable:record:created`
   - `bitable:record:updated`
   - `bitable:record:deleted`
5. 保存并发布新版本

---

## 🔄 同步状态

应用左侧边栏显示同步状态指示器：

- 🟢 **已同步**: 显示上次同步时间
- 🟡 **同步中**: 显示同步进度
- 🔴 **同步失败**: 显示错误信息
- ⏰ **下次同步**: 显示定时同步时间
- 🔄 **立即同步**: 手动触发同步按钮

---

## 📊 数据映射

### 导师表
| 飞书字段 | 本地字段 | 类型 |
|---------|---------|------|
| 导师工号 | teacherId | string |
| 姓名 | name | string |
| 导师类型 | type | enum |
| 合作状态 | cooperationStatus | enum |
| 专业方向 | majorDirections | array |

### 学生表
| 飞书字段 | 本地字段 | 类型 |
|---------|---------|------|
| 学号 | studentId | string |
| 姓名 | name | string |
| 当前阶段 | currentStage | enum |
| 总课时 | totalHours | number |
| 剩余课时 | remainingHours | number |

### 上课记录表
| 飞书字段 | 本地字段 | 类型 |
|---------|---------|------|
| 记录编号 | recordId | string |
| 学生 | studentName | string |
| 导师 | teacherName | string |
| 上课日期 | classDate | timestamp |
| 授课内容摘要 | contentSummary | text |

---

## 🚀 后续优化

1. **冲突处理**: 当飞书和本地同时修改时，以飞书为准
2. **增量同步**: 只同步变更的记录，提升效率
3. **离线支持**: 网络断开时缓存操作，恢复后同步
4. **操作日志**: 记录所有同步操作，便于排查问题

---

## 📞 问题排查

### 数据不同步
1. 检查同步状态指示器
2. 手动点击"立即同步"
3. 查看控制台日志

### 写入失败
1. 检查飞书应用权限
2. 确认多维表格已添加应用
3. 查看API返回错误信息

### Webhook不生效
1. 确认飞书开放平台配置正确
2. 检查Webhook URL可访问性
3. 查看飞书开放平台事件推送日志
