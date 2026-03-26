/**
 * 数据库表创建脚本
 * 
 * 用于创建缺失的数据库表
 * 执行方式: 通过 API 调用 /api/init/database
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

// 创建枚举类型
const CREATE_ENUMS = `
-- 创建枚举类型（如果不存在）
DO $$ BEGIN
    CREATE TYPE teacher_type AS ENUM ('全职', '兼职');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 飞书对接枚举
DO $$ BEGIN
    CREATE TYPE student_status AS ENUM ('意向学员', '正式学员', '休学学员', '结课学员');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE student_category AS ENUM ('作品集学员', '技能提升学员', '游学学员', '其他');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE course_type_enum AS ENUM ('作品集', '技能提升', '游学', '其他');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE teacher_cooperation_type AS ENUM ('全职', '兼职', '合作');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE teacher_specialty AS ENUM ('作品集', '技能提升', '游学', '其他');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE id_type AS ENUM ('身份证', '护照', '港澳通行证', '台湾通行证', '其他');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_enum AS ENUM ('正常到课', '请假缺课', '无故缺课', '迟到', '早退');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE settlement_status_enum AS ENUM ('待结课', '待审核', '已审核', '已支付');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE employment_status AS ENUM ('在职', '离职', '休假');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('学生', '管理员', '规划顾问', '全职导师', '兼职导师');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE week_day AS ENUM ('周一', '周二', '周三', '周四', '周五', '周六', '周日');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE time_slot AS ENUM ('10:00', '13:00', '15:00', '18:00', '20:00');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE course_category AS ENUM ('F-GD', 'F-TA', 'F-GA', 'F-3D', 'F-AN', 'P-GD', 'P-AN', 'P-GA', 'P-CA', 'P-3DGA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE time_reservation_type AS ENUM ('空闲', '顾问指导', '固定课程', '不可用');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reservation_purpose AS ENUM ('填写时间表', '预约上课', '选课指导', '其他');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE class_record_status AS ENUM ('已排课', '已完成', '已取消', '学生缺席', '补课');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_phase AS ENUM ('Concept', 'Modeling', 'Texturing', 'Lighting', 'Render', 'Portfolio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE schedule_status AS ENUM ('待确认', '已确认', '已完成', '取消');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE selection_form_status AS ENUM ('草稿', '待审核', '已确认', '已完成');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE selection_item_status AS ENUM ('待排课', '已排课', '已完成', '已取消');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
`;

// 创建 consultants 表（与 schema.ts 一致）
const CREATE_CONSULTANTS_TABLE = `
DROP TABLE IF EXISTS consultants CASCADE;
CREATE TABLE consultants (
    id VARCHAR(36) PRIMARY KEY,
    consultant_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'standard',
    
    -- 联系信息
    email VARCHAR(200),
    phone VARCHAR(20),
    wechat VARCHAR(50),
    
    -- 飞书集成
    feishu_user_id VARCHAR(100) UNIQUE,
    feishu_record_id VARCHAR(100),
    
    -- 用户账号关联
    user_id VARCHAR(36),
    
    -- 统计数据
    total_students INTEGER NOT NULL DEFAULT 0,
    active_students INTEGER NOT NULL DEFAULT 0,
    
    -- 状态
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- 备注
    notes TEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 创建 users 表（与 schema.ts 一致）
const CREATE_USERS_TABLE = `
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role user_role NOT NULL,
    
    -- 关联信息
    teacher_id VARCHAR(36),
    student_id VARCHAR(36),
    consultant_id VARCHAR(36),
    
    -- 基本信息
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(20),
    avatar VARCHAR(500),
    
    -- 飞书集成信息
    feishu_open_id VARCHAR(100) UNIQUE,
    feishu_union_id VARCHAR(100) UNIQUE,
    feishu_access_token VARCHAR(500),
    feishu_refresh_token VARCHAR(500),
    feishu_token_expires_at TIMESTAMP,
    
    -- 状态
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP,
    last_login_method VARCHAR(20),
    
    -- 通知偏好
    notification_channels JSONB DEFAULT '{"feishu": true, "wechat": true, "email": false, "sms": false}',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 创建 sessions 表
const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 创建 students 表（与 schema.ts 一致）
const CREATE_STUDENTS_TABLE = `
DROP TABLE IF EXISTS students CASCADE;
CREATE TABLE students (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    major VARCHAR(50) NOT NULL,
    application_country VARCHAR(50) NOT NULL,
    current_stage VARCHAR(50) NOT NULL,
    
    -- 课时信息
    total_hours INTEGER NOT NULL DEFAULT 0,
    consumed_hours INTEGER NOT NULL DEFAULT 0,
    remaining_hours INTEGER NOT NULL DEFAULT 0,
    
    -- 联系信息
    email VARCHAR(200),
    phone VARCHAR(20),
    wechat VARCHAR(50),
    
    -- 负责人
    consultant_id VARCHAR(36),
    primary_teacher_id VARCHAR(36),
    
    -- 飞书多维表格对接字段
    student_status VARCHAR(20) DEFAULT '在读',
    student_category VARCHAR(50),
    admission_consultant_id VARCHAR(36),
    course_categories VARCHAR(50)[],
    teacher_ids VARCHAR(36)[],
    hourly_rate INTEGER,
    contract_id VARCHAR(36),
    feishu_record_id VARCHAR(100),
    
    -- 通知偏好
    notification_channels JSONB DEFAULT '{"wechat": true, "email": false, "sms": false}',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 插入测试用户数据
const INSERT_TEST_USERS = `
INSERT INTO users (id, username, name, role, email, is_active)
VALUES 
    ('user-admin-001', 'admin', '系统管理员', '管理员', 'admin@artico.com', true),
    ('user-consultant-001', 'consultant1', '张顾问', '规划顾问', 'consultant1@artico.com', true),
    ('user-teacher-001', 'teacher1', '王老师', '全职导师', 'wang@artico.com', true),
    ('user-teacher-002', 'teacher2', '李老师', '全职导师', 'li@artico.com', true),
    ('user-teacher-003', 'teacher3', '张老师', '兼职导师', 'zhang@artico.com', true),
    ('user-student-001', 'student1', '测试学生', '学生', 'student1@artico.com', true)
ON CONFLICT (id) DO NOTHING;
`;

// 创建 teachers 表（与 schema.ts 一致）
const CREATE_TEACHERS_TABLE = `
DROP TABLE IF EXISTS teachers CASCADE;
CREATE TABLE teachers (
    id VARCHAR(36) PRIMARY KEY,
    teacher_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    teachable_courses course_category[] NOT NULL DEFAULT '{}',
    teacher_type teacher_type NOT NULL DEFAULT '全职',
    max_weekly_hours INTEGER NOT NULL DEFAULT 20,
    current_hours INTEGER NOT NULL DEFAULT 0,
    email VARCHAR(200),
    phone VARCHAR(20),
    bio TEXT,
    
    -- 飞书集成
    feishu_user_id VARCHAR(100) UNIQUE,
    
    -- 飞书多维表格对接新增字段
    cooperation_status VARCHAR(20) DEFAULT '合作中',
    employment_status VARCHAR(20) DEFAULT '在职',
    major_directions VARCHAR(50)[],
    wechat_id VARCHAR(50),
    meeting_link VARCHAR(500),
    id_type VARCHAR(20),
    id_number VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    contract_expiry DATE,
    
    -- 统计数据
    project_course_count INTEGER DEFAULT 0,
    settled_count INTEGER DEFAULT 0,
    settlement_rate INTEGER DEFAULT 0,
    
    -- 飞书多维表格同步
    feishu_record_id VARCHAR(100),
    
    -- 通知偏好
    notification_channels JSONB DEFAULT '{"feishu": true, "wechat": false, "email": false, "sms": false}',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 创建 time_availabilities 表
const CREATE_TIME_AVAILABILITIES_TABLE = `
CREATE TABLE IF NOT EXISTS time_availabilities (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    user_role user_role NOT NULL,
    name VARCHAR(100) NOT NULL,
    week_day week_day NOT NULL,
    time_slot time_slot NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    reservation_type time_reservation_type NOT NULL DEFAULT '空闲',
    reservation_purpose reservation_purpose,
    consultant_id VARCHAR(36),
    student_id VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 创建 schedule_results 表
const CREATE_SCHEDULE_RESULTS_TABLE = `
CREATE TABLE IF NOT EXISTS schedule_results (
    id VARCHAR(36) PRIMARY KEY,
    schedule_id VARCHAR(50) NOT NULL UNIQUE,
    student_id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    student_course_id VARCHAR(36),
    date DATE NOT NULL,
    week_day week_day NOT NULL,
    time_slot time_slot NOT NULL,
    hours INTEGER NOT NULL DEFAULT 2,
    status schedule_status NOT NULL DEFAULT '待确认',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 创建 course_selection_forms 表
const CREATE_COURSE_SELECTION_FORMS_TABLE = `
CREATE TABLE IF NOT EXISTS course_selection_forms (
    id VARCHAR(36) PRIMARY KEY,
    form_id VARCHAR(50) NOT NULL UNIQUE,
    student_id VARCHAR(36) NOT NULL,
    consultant_id VARCHAR(36),
    status selection_form_status NOT NULL DEFAULT '草稿',
    total_hours INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 创建 course_selection_items 表
const CREATE_COURSE_SELECTION_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS course_selection_items (
    id VARCHAR(36) PRIMARY KEY,
    form_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    hours INTEGER NOT NULL DEFAULT 2,
    priority INTEGER NOT NULL DEFAULT 1,
    status selection_item_status NOT NULL DEFAULT '待排课',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 创建 class_records 表
const CREATE_CLASS_RECORDS_TABLE = `
DROP TABLE IF EXISTS class_records CASCADE;
CREATE TABLE class_records (
    id VARCHAR(36) PRIMARY KEY,
    record_id VARCHAR(50) NOT NULL UNIQUE,
    schedule_id VARCHAR(50),
    
    -- 基本信息
    student_id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    selection_item_id VARCHAR(36),
    
    -- 课程类别与内容
    course_category VARCHAR(100),
    course_content_detail VARCHAR(200),
    
    -- 上课信息
    class_date DATE NOT NULL,
    week_day week_day NOT NULL,
    start_time time_slot NOT NULL,
    end_time VARCHAR(10),
    actual_duration INTEGER NOT NULL DEFAULT 120,
    
    -- 课程内容
    content_summary TEXT NOT NULL,
    teaching_method VARCHAR(100),
    
    -- 学生表现
    student_performance TEXT,
    attendance_status class_record_status NOT NULL DEFAULT '已排课',
    
    -- 作业与反馈
    homework_assigned TEXT,
    homework_deadline DATE,
    homework_completion_rate INTEGER DEFAULT 0,
    last_homework_quality VARCHAR(50),
    next_class_plan TEXT,
    teacher_feedback TEXT,
    student_feedback TEXT,
    
    -- 项目课特有
    project_phase project_phase,
    phase_content TEXT,
    
    -- 附件
    attachments JSONB,
    
    -- PDF文件
    pdf_url VARCHAR(500),
    pdf_generated_at TIMESTAMP,
    
    -- 学生签字
    student_signature VARCHAR(500),
    signature_time TIMESTAMP,
    signature_method VARCHAR(20),
    
    -- 签字链接
    sign_token VARCHAR(64) UNIQUE,
    sign_token_expires_at TIMESTAMP,
    sign_link_sent_at TIMESTAMP,
    sign_link_sent_to VARCHAR(200),
    
    -- 记录创建者
    created_by VARCHAR(36) NOT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 创建 workflow 相关表
const CREATE_WORKFLOW_TABLES = `
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_stage_definitions (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_task_templates (
    id VARCHAR(36) PRIMARY KEY,
    stage_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    assignee_type VARCHAR(20) NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    current_stage INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT '进行中',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_task_instances (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36) NOT NULL,
    assignee_id VARCHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT '待处理',
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// 插入测试导师数据
const INSERT_TEST_TEACHERS = `
INSERT INTO teachers (id, teacher_id, name, teachable_courses, teacher_type, max_weekly_hours, current_hours, email)
VALUES 
    ('teacher-001', 'T001', '王老师', ARRAY['F-GD', 'F-GA', 'P-GD']::course_category[], '全职', 20, 0, 'wang@artico.com'),
    ('teacher-002', 'T002', '李老师', ARRAY['F-AN', 'P-AN', 'F-3D']::course_category[], '全职', 20, 0, 'li@artico.com'),
    ('teacher-003', 'T003', '张老师', ARRAY['F-TA', 'P-3DGA']::course_category[], '兼职', 10, 0, 'zhang@artico.com')
ON CONFLICT (id) DO NOTHING;
`;

export async function GET() {
  try {
    const results: string[] = [];
    
    // 创建枚举类型
    try {
      await db.execute(sql.raw(CREATE_ENUMS));
      results.push('✅ 枚举类型创建成功');
    } catch (e) {
      results.push('⚠️ 枚举类型已存在或创建失败');
    }
    
    // 创建 teachers 表
    try {
      await db.execute(sql.raw(CREATE_TEACHERS_TABLE));
      results.push('✅ teachers 表创建成功');
    } catch (e) {
      results.push('⚠️ teachers 表已存在或创建失败: ' + (e as Error).message);
    }
    
    // 创建 consultants 表
    try {
      await db.execute(sql.raw(CREATE_CONSULTANTS_TABLE));
      results.push('✅ consultants 表创建成功');
    } catch (e) {
      results.push('⚠️ consultants 表已存在或创建失败: ' + (e as Error).message);
    }
    
    // 创建 users 表
    try {
      await db.execute(sql.raw(CREATE_USERS_TABLE));
      results.push('✅ users 表创建成功');
    } catch (e) {
      results.push('⚠️ users 表已存在或创建失败: ' + (e as Error).message);
    }
    
    // 创建 sessions 表
    try {
      await db.execute(sql.raw(CREATE_SESSIONS_TABLE));
      results.push('✅ sessions 表创建成功');
    } catch (e) {
      results.push('⚠️ sessions 表已存在或创建失败: ' + (e as Error).message);
    }
    
    // 创建 students 表
    try {
      await db.execute(sql.raw(CREATE_STUDENTS_TABLE));
      results.push('✅ students 表创建成功');
    } catch (e) {
      results.push('⚠️ students 表已存在或创建失败: ' + (e as Error).message);
    }
    
    // 创建 time_availabilities 表
    try {
      await db.execute(sql.raw(CREATE_TIME_AVAILABILITIES_TABLE));
      results.push('✅ time_availabilities 表创建成功');
    } catch (e) {
      results.push('⚠️ time_availabilities 表已存在或创建失败');
    }
    
    // 创建 schedule_results 表
    try {
      await db.execute(sql.raw(CREATE_SCHEDULE_RESULTS_TABLE));
      results.push('✅ schedule_results 表创建成功');
    } catch (e) {
      results.push('⚠️ schedule_results 表已存在或创建失败');
    }
    
    // 创建 course_selection_forms 表
    try {
      await db.execute(sql.raw(CREATE_COURSE_SELECTION_FORMS_TABLE));
      results.push('✅ course_selection_forms 表创建成功');
    } catch (e) {
      results.push('⚠️ course_selection_forms 表已存在或创建失败');
    }
    
    // 创建 course_selection_items 表
    try {
      await db.execute(sql.raw(CREATE_COURSE_SELECTION_ITEMS_TABLE));
      results.push('✅ course_selection_items 表创建成功');
    } catch (e) {
      results.push('⚠️ course_selection_items 表已存在或创建失败');
    }
    
    // 创建 class_records 表
    try {
      await db.execute(sql.raw(CREATE_CLASS_RECORDS_TABLE));
      results.push('✅ class_records 表创建成功');
    } catch (e) {
      results.push('⚠️ class_records 表已存在或创建失败');
    }
    
    // 创建 workflow 表
    try {
      await db.execute(sql.raw(CREATE_WORKFLOW_TABLES));
      results.push('✅ workflow 相关表创建成功');
    } catch (e) {
      results.push('⚠️ workflow 相关表已存在或创建失败');
    }
    
    // 插入测试导师数据
    try {
      await db.execute(sql.raw(INSERT_TEST_TEACHERS));
      results.push('✅ 测试导师数据插入成功');
    } catch (e) {
      results.push('⚠️ 测试导师数据已存在或插入失败');
    }
    
    // 插入测试用户数据
    try {
      await db.execute(sql.raw(INSERT_TEST_USERS));
      results.push('✅ 测试用户数据插入成功');
    } catch (e) {
      results.push('⚠️ 测试用户数据已存在或插入失败: ' + (e as Error).message);
    }
    
    return NextResponse.json({
      success: true,
      message: '数据库表初始化完成',
      results,
    });
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '数据库初始化失败',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
