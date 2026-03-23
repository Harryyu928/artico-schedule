import { pgTable, unique, varchar, integer, timestamp, serial, text, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const applicationCountry = pgEnum("application_country", ['美国', '英国', '加拿大', '日本'])
export const courseCategory = pgEnum("course_category", ['F-GD', 'F-TA', 'F-GA', 'F-3D', 'F-AN', 'P-GD', 'P-AN', 'P-GA', 'P-CA', 'P-3DGA'])
export const courseDuration = pgEnum("course_duration", ['4周', '5周', '1个月', '2个月', '3个月'])
export const courseStage = pgEnum("course_stage", ['基础', '项目', '作品集'])
export const courseType = pgEnum("course_type", ['基础课', '项目课'])
export const majorDirection = pgEnum("major_direction", ['游戏设计', '游戏美术', '角色设计', '3D游戏美术', '动画'])
export const scheduleStatus = pgEnum("schedule_status", ['待确认', '已确认', '已完成', '取消'])
export const studyStage = pgEnum("study_stage", ['基础阶段', '项目阶段', '作品集打磨'])
export const teacherType = pgEnum("teacher_type", ['全职', '兼职'])
export const timeSlot = pgEnum("time_slot", ['10:00', '13:00', '15:00', '18:00', '20:00'])
export const userRole = pgEnum("user_role", ['学生', '导师', '管理员'])
export const weekDay = pgEnum("week_day", ['周一', '周二', '周三', '周四', '周五', '周六', '周日'])


export const students = pgTable("students", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	major: majorDirection().notNull(),
	applicationCountry: applicationCountry("application_country").notNull(),
	currentStage: studyStage("current_stage").notNull(),
	totalHours: integer("total_hours").default(0).notNull(),
	usedHours: integer("used_hours").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("students_student_id_key").on(table.studentId),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const courses = pgTable("courses", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	courseId: varchar("course_id", { length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	type: courseType().notNull(),
	category: courseCategory().notNull(),
	duration: courseDuration().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("courses_course_id_key").on(table.courseId),
]);
