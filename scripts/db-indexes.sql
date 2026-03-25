/**
 * 数据库索引优化迁移脚本
 * 为高频查询字段添加索引以提升查询性能
 * 
 * 执行方式: 在Supabase SQL编辑器中执行此脚本
 */

-- ============================================
-- 1. 用户相关索引
-- ============================================

-- 用户邮箱索引（登录查询）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 用户角色索引（权限过滤）
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 用户飞书ID索引（飞书登录）
CREATE INDEX IF NOT EXISTS idx_users_feishu_id ON users(feishu_id);

-- ============================================
-- 2. 学生相关索引
-- ============================================

-- 学生状态索引（列表过滤）
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- 学生年级索引（分组统计）
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);

-- 学生规划顾问索引（顾问查看自己的学生）
CREATE INDEX IF NOT EXISTS idx_students_planning_consultant ON students(planning_consultant_id);

-- 学生创建时间索引（时间范围查询）
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);

-- ============================================
-- 3. 导师相关索引
-- ============================================

-- 导师类型索引（全职/兼职过滤）
CREATE INDEX IF NOT EXISTS idx_teachers_type ON teachers(type);

-- 导师状态索引（在职状态过滤）
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

-- ============================================
-- 4. 课程相关索引
-- ============================================

-- 课程类型索引（基础课/项目课过滤）
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(type);

-- 课程阶段索引（基础/项目/作品集过滤）
CREATE INDEX IF NOT EXISTS idx_courses_stage ON courses(stage);

-- 课程类别索引
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

-- 课程状态索引
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- ============================================
-- 5. 时间可用性索引
-- ============================================

-- 导师时间可用性（导师查看自己的时间表）
CREATE INDEX IF NOT EXISTS idx_time_availabilities_teacher_id ON time_availabilities(teacher_id);

-- 学生时间可用性（学生查看自己的时间表）
CREATE INDEX IF NOT EXISTS idx_time_availabilities_student_id ON time_availabilities(student_id);

-- 组合索引：导师+星期+时间段（排课查询优化）
CREATE INDEX IF NOT EXISTS idx_time_availabilities_teacher_week_slot 
ON time_availabilities(teacher_id, week_day, time_slot);

-- 组合索引：学生+星期+时间段（排课查询优化）
CREATE INDEX IF NOT EXISTS idx_time_availabilities_student_week_slot 
ON time_availabilities(student_id, week_day, time_slot);

-- ============================================
-- 6. 排课结果索引
-- ============================================

-- 学生排课记录
CREATE INDEX IF NOT EXISTS idx_schedule_results_student_id ON schedule_results(student_id);

-- 导师排课记录
CREATE INDEX IF NOT EXISTS idx_schedule_results_teacher_id ON schedule_results(teacher_id);

-- 课程排课记录
CREATE INDEX IF NOT EXISTS idx_schedule_results_course_id ON schedule_results(course_id);

-- 排课状态索引
CREATE INDEX IF NOT EXISTS idx_schedule_results_status ON schedule_results(status);

-- 上课日期索引（日历视图查询）
CREATE INDEX IF NOT EXISTS idx_schedule_results_class_date ON schedule_results(class_date);

-- 组合索引：学生+状态（学生查看自己的排课）
CREATE INDEX IF NOT EXISTS idx_schedule_results_student_status 
ON schedule_results(student_id, status);

-- 组合索引：导师+状态（导师查看自己的课程）
CREATE INDEX IF NOT EXISTS idx_schedule_results_teacher_status 
ON schedule_results(teacher_id, status);

-- 组合索引：导师+日期（导师日程查询）
CREATE INDEX IF NOT EXISTS idx_schedule_results_teacher_date 
ON schedule_results(teacher_id, class_date);

-- ============================================
-- 7. 选课单索引
-- ============================================

-- 学生选课单
CREATE INDEX IF NOT EXISTS idx_course_selection_forms_student_id ON course_selection_forms(student_id);

-- 选课单状态
CREATE INDEX IF NOT EXISTS idx_course_selection_forms_status ON course_selection_forms(status);

-- 规划顾问索引
CREATE INDEX IF NOT EXISTS idx_course_selection_forms_consultation_teacher ON course_selection_forms(consultation_teacher_id);

-- 创建时间索引
CREATE INDEX IF NOT EXISTS idx_course_selection_forms_created_at ON course_selection_forms(created_at);

-- 签字Token索引（学生签字链接）
CREATE INDEX IF NOT EXISTS idx_course_selection_forms_sign_token ON course_selection_forms(sign_token);

-- ============================================
-- 8. 选课单明细索引
-- ============================================

-- 选课单明细关联
CREATE INDEX IF NOT EXISTS idx_course_selection_items_form_id ON course_selection_items(form_id);

-- 课程索引
CREATE INDEX IF NOT EXISTS idx_course_selection_items_course_id ON course_selection_items(course_id);

-- 明细状态索引
CREATE INDEX IF NOT EXISTS idx_course_selection_items_status ON course_selection_items(status);

-- ============================================
-- 9. 上课记录索引
-- ============================================

-- 学生上课记录
CREATE INDEX IF NOT EXISTS idx_class_records_student_id ON class_records(student_id);

-- 导师上课记录
CREATE INDEX IF NOT EXISTS idx_class_records_teacher_id ON class_records(teacher_id);

-- 课程上课记录
CREATE INDEX IF NOT EXISTS idx_class_records_course_id ON class_records(course_id);

-- 选课单明细关联
CREATE INDEX IF NOT EXISTS idx_class_records_selection_item_id ON class_records(selection_item_id);

-- 上课日期索引
CREATE INDEX IF NOT EXISTS idx_class_records_class_date ON class_records(class_date);

-- 记录状态索引
CREATE INDEX IF NOT EXISTS idx_class_records_status ON class_records(status);

-- 签字Token索引
CREATE INDEX IF NOT EXISTS idx_class_records_sign_token ON class_records(sign_token);

-- 组合索引：学生+状态
CREATE INDEX IF NOT EXISTS idx_class_records_student_status ON class_records(student_id, status);

-- 组合索引：导师+日期
CREATE INDEX IF NOT EXISTS idx_class_records_teacher_date ON class_records(teacher_id, class_date);

-- ============================================
-- 10. 工作流定义索引
-- ============================================

-- 工作流类型索引
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_type ON workflow_definitions(type);

-- 工作流状态索引
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_status ON workflow_definitions(status);

-- ============================================
-- 11. 工作流阶段定义索引
-- ============================================

-- 工作流ID索引
CREATE INDEX IF NOT EXISTS idx_workflow_stage_definitions_workflow_id ON workflow_stage_definitions(workflow_id);

-- 阶段顺序索引
CREATE INDEX IF NOT EXISTS idx_workflow_stage_definitions_order ON workflow_stage_definitions(stage_order);

-- ============================================
-- 12. 工作流实例索引
-- ============================================

-- 工作流定义关联
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id ON workflow_instances(workflow_id);

-- 实体类型索引
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity_type ON workflow_instances(entity_type);

-- 实体ID索引
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity_id ON workflow_instances(entity_id);

-- 当前阶段索引
CREATE INDEX IF NOT EXISTS idx_workflow_instances_current_stage_id ON workflow_instances(current_stage_id);

-- 实例状态索引
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);

-- 创建时间索引
CREATE INDEX IF NOT EXISTS idx_workflow_instances_created_at ON workflow_instances(created_at);

-- 完成时间索引
CREATE INDEX IF NOT EXISTS idx_workflow_instances_completed_at ON workflow_instances(completed_at);

-- 组合索引：实体类型+实体ID
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);

-- 组合索引：状态+创建时间（待处理任务查询）
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status_created ON workflow_instances(status, created_at);

-- ============================================
-- 13. 工作流任务实例索引（最关键）
-- ============================================

-- 工作流实例关联（最重要）
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_instance_id ON workflow_task_instances(instance_id);

-- 阶段ID索引
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_stage_id ON workflow_task_instances(stage_id);

-- 任务分配者索引（查看我的任务）
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_assignee_id ON workflow_task_instances(assignee_id);

-- 任务角色索引
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_assignee_role ON workflow_task_instances(assignee_role);

-- 任务状态索引
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_status ON workflow_task_instances(status);

-- 截止日期索引（超时任务查询）
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_due_date ON workflow_task_instances(due_date);

-- 创建时间索引
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_created_at ON workflow_task_instances(created_at);

-- 完成时间索引
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_completed_at ON workflow_task_instances(completed_at);

-- 组合索引：实例+状态（阶段任务查询）
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_instance_status 
ON workflow_task_instances(instance_id, status);

-- 组合索引：分配者+状态（我的待办任务）
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_assignee_status 
ON workflow_task_instances(assignee_id, status);

-- 组合索引：分配者+截止日期（任务提醒查询）
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_assignee_due 
ON workflow_task_instances(assignee_id, due_date);

-- 组合索引：状态+截止日期（超时任务批量查询）
CREATE INDEX IF NOT EXISTS idx_workflow_task_instances_status_due 
ON workflow_task_instances(status, due_date);

-- ============================================
-- 14. 时间预留索引
-- ============================================

-- 学生时间预留
CREATE INDEX IF NOT EXISTS idx_time_reservations_student_id ON time_reservations(student_id);

-- 顾问时间预留
CREATE INDEX IF NOT EXISTS idx_time_reservations_consultant_id ON time_reservations(consultant_id);

-- 预留日期索引
CREATE INDEX IF NOT EXISTS idx_time_reservations_date ON time_reservations(reservation_date);

-- 预留类型索引
CREATE INDEX IF NOT EXISTS idx_time_reservations_type ON time_reservations(reservation_type);

-- 组合索引：顾问+日期
CREATE INDEX IF NOT EXISTS idx_time_reservations_consultant_date 
ON time_reservations(consultant_id, reservation_date);

-- ============================================
-- 15. 申请学校索引
-- ============================================

-- 学生申请学校
CREATE INDEX IF NOT EXISTS idx_application_schools_student_id ON application_schools(student_id);

-- 国家索引
CREATE INDEX IF NOT EXISTS idx_application_schools_country ON application_schools(country);

-- ============================================
-- 16. Session索引
-- ============================================

-- Session用户关联
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Session Token索引
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Session过期时间索引（清理过期Session）
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- 17. 复合索引（复杂查询优化）
-- ============================================

-- 排课冲突检测：导师+星期+时间段+状态
CREATE INDEX IF NOT EXISTS idx_schedule_conflict_teacher 
ON schedule_results(teacher_id, week_day, time_slot, status);

-- 排课冲突检测：学生+星期+时间段+状态
CREATE INDEX IF NOT EXISTS idx_schedule_conflict_student 
ON schedule_results(student_id, week_day, time_slot, status);

-- 工作流效率分析：实例+创建时间+状态
CREATE INDEX IF NOT EXISTS idx_workflow_analytics 
ON workflow_instances(workflow_id, status, created_at);

-- ============================================
-- 18. 部分索引（条件索引，减少索引大小）
-- ============================================

-- 仅索引待处理的任务（最常用查询）
CREATE INDEX IF NOT EXISTS idx_tasks_pending 
ON workflow_task_instances(assignee_id, due_date) 
WHERE status = 'pending';

-- 仅索引进行中的工作流实例
CREATE INDEX IF NOT EXISTS idx_instances_active 
ON workflow_instances(entity_type, entity_id) 
WHERE status IN ('pending', 'in_progress');

-- 仅索引未确认的排课
CREATE INDEX IF NOT EXISTS idx_schedules_unconfirmed 
ON schedule_results(student_id, class_date) 
WHERE status = '待确认';

-- ============================================
-- 索引使用情况监控查询（可选执行）
-- ============================================

-- 查看索引使用统计
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- 查看未使用的索引
-- SELECT 
--   schemaname || '.' || relname AS table,
--   indexrelname AS index,
--   pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
--   idx_scan as index_scans
-- FROM pg_stat_user_indexes ui
-- JOIN pg_index i ON ui.indexrelid = i.indexrelid
-- WHERE NOT i.indisunique 
--   AND idx_scan < 50 
--   AND pg_relation_size(i.indexrelid) > 1024 * 1024
-- ORDER BY pg_relation_size(i.indexrelid) DESC;

-- 查看表大小和索引大小
-- SELECT 
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
--   pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
