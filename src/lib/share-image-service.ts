/**
 * 分享图片生成服务
 * 在需要分享教务信息时自动调用AI生图功能
 */

/**
 * 生成学生学习进度报告图片
 * 场景：分享给学生家长、学生本人查看
 */
export async function generateStudentProgressImage(data: {
  studentName: string;
  studentId: string;
  major: string;
  currentStage: string;
  totalHours: number;
  usedHours: number;
  completedCourses: number;
  totalCourses: number;
  recentAchievements?: string[];
}): Promise<string | null> {
  try {
    const progressRate = Math.round((data.usedHours / data.totalHours) * 100);
    const courseRate = Math.round((data.completedCourses / data.totalCourses) * 100);
    
    const prompt = `
Generate a professional education progress report image with modern design:
- Student name: ${data.studentName} (${data.studentId})
- Major: ${data.major}
- Current stage: ${data.currentStage}
- Course progress: ${data.completedCourses}/${data.totalCourses} courses (${courseRate}%)
- Hours progress: ${data.usedHours}/${data.totalHours} hours (${progressRate}%)
- Style: Clean, modern, education-themed with orange accent colors
- Include progress bars or circular progress indicators
- Professional infographic style suitable for sharing with parents
- Chinese text with elegant typography
- Vertical layout for mobile sharing
    `.trim();

    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '2K' }),
    });

    if (!response.ok) {
      console.error('API请求失败:', response.status, response.statusText);
      return null;
    }

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error('JSON解析失败:', e);
      return null;
    }
    
    return result.success ? result.url : null;
  } catch (error) {
    console.error('生成学生进度图片失败:', error);
    return null;
  }
}

/**
 * 生成选课单规划图
 * 场景：分享给学生，展示课程规划
 */
export async function generateSelectionFormImage(data: {
  formId: string;
  studentName: string;
  teacherName?: string;
  totalCourses: number;
  totalHours: number;
  estimatedStartDate: string;
  estimatedEndDate: string;
  goals?: string;
  courses: Array<{
    courseName: string;
    plannedHours: number;
    status: string;
  }>;
}): Promise<string | null> {
  try {
    const coursesInfo = data.courses
      .slice(0, 5) // 最多显示5门课程
      .map(c => `- ${c.courseName}: ${c.plannedHours}h (${c.status})`)
      .join('\n');

    const prompt = `
Generate a course selection plan visualization image:
- Form ID: ${data.formId}
- Student: ${data.studentName}
- Advisor: ${data.teacherName || '待定'}
- Duration: ${data.estimatedStartDate} to ${data.estimatedEndDate}
- Total: ${data.totalCourses} courses, ${data.totalHours} hours
- Goals: ${data.goals || '无'}
- Course list:
${coursesInfo}
- Style: Professional timeline or roadmap design
- Orange and blue color scheme
- Clean infographic layout
- Suitable for student reference
- Chinese text
- Vertical layout for mobile sharing
    `.trim();

    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '2K' }),
    });

    if (!response.ok) {
      console.error('API请求失败:', response.status, response.statusText);
      return null;
    }

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error('JSON解析失败:', e);
      return null;
    }
    
    return result.success ? result.url : null;
  } catch (error) {
    console.error('生成选课单图片失败:', error);
    return null;
  }
}

/**
 * 生成导师授课统计图
 * 场景：分享给导师，展示工作量和收入
 */
export async function generateTeacherStatsImage(data: {
  teacherName: string;
  teacherId: string;
  teacherType: string;
  totalStudents: number;
  totalHoursThisMonth: number;
  totalHoursThisWeek: number;
  upcomingClasses: number;
  maxWeeklyHours: number;
}): Promise<string | null> {
  try {
    const workloadRate = Math.round((data.totalHoursThisWeek / data.maxWeeklyHours) * 100);
    
    const prompt = `
Generate a teacher workload statistics image:
- Teacher: ${data.teacherName} (${data.teacherId})
- Type: ${data.teacherType}
- Total students: ${data.totalStudents}
- This month: ${data.totalHoursThisMonth} hours
- This week: ${data.totalHoursThisWeek}/${data.maxWeeklyHours} hours (${workloadRate}%)
- Upcoming classes: ${data.upcomingClasses}
- Style: Clean dashboard-style visualization
- Orange accent colors
- Professional and motivating design
- Include charts or graphs
- Chinese text
- Vertical layout for mobile sharing
    `.trim();

    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '2K' }),
    });

    if (!response.ok) {
      console.error('API请求失败:', response.status, response.statusText);
      return null;
    }

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error('JSON解析失败:', e);
      return null;
    }
    
    return result.success ? result.url : null;
  } catch (error) {
    console.error('生成导师统计图片失败:', error);
    return null;
  }
}

/**
 * 生成课后总结图片
 * 场景：分享给家长，展示学生课堂表现
 */
export async function generateClassSummaryImage(data: {
  studentName: string;
  courseName: string;
  teacherName: string;
  classDate: string;
  duration: number;
  contentSummary: string;
  studentPerformance: string;
  homework?: string;
  nextPlan?: string;
}): Promise<string | null> {
  try {
    const prompt = `
Generate a class summary report image for parents:
- Student: ${data.studentName}
- Course: ${data.courseName}
- Teacher: ${data.teacherName}
- Date: ${data.classDate}
- Duration: ${data.duration} minutes
- Content: ${data.contentSummary}
- Performance: ${data.studentPerformance}
- Homework: ${data.homework || '无'}
- Next plan: ${data.nextPlan || '待定'}
- Style: Warm, encouraging, education-focused design
- Orange and green accent colors
- Suitable for parent communication
- Include icons or illustrations
- Chinese text
- Vertical layout for mobile sharing
    `.trim();

    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '2K' }),
    });

    if (!response.ok) {
      console.error('API请求失败:', response.status, response.statusText);
      return null;
    }

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error('JSON解析失败:', e);
      return null;
    }
    
    return result.success ? result.url : null;
  } catch (error) {
    console.error('生成课堂总结图片失败:', error);
    return null;
  }
}

/**
 * 生成系统数据统计图
 * 场景：管理层汇报，展示整体运营情况
 */
export async function generateSystemStatsImage(data: {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  activeSelectionForms: number;
  thisWeekHours: number;
  thisMonthHours: number;
  averageCompletionRate: number;
}): Promise<string | null> {
  try {
    const prompt = `
Generate a system statistics dashboard image:
- Total students: ${data.totalStudents}
- Total teachers: ${data.totalTeachers}
- Total courses: ${data.totalCourses}
- Active selection forms: ${data.activeSelectionForms}
- This week: ${data.thisWeekHours} hours
- This month: ${data.thisMonthHours} hours
- Average completion: ${data.averageCompletionRate}%
- Style: Professional dashboard with charts
- Orange, blue, and green color scheme
- Corporate and clean design
- Suitable for management reporting
- Include bar charts, pie charts, and key metrics
- Chinese text
- Horizontal layout for presentation
    `.trim();

    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '4K' }),
    });

    const result = await response.json();
    return result.success ? result.url : null;
  } catch (error) {
    console.error('生成系统统计图片失败:', error);
    return null;
  }
}
