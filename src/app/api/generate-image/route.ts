import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * AI生图API
 * 用于生成排课信息分享图和上课记录分享图
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // 提取并转发请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    
    // 初始化客户端
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 根据类型生成不同的图片
    let prompt = '';
    
    switch (type) {
      case 'schedule':
        // 排课信息分享图
        prompt = generateSchedulePrompt(data);
        break;
      case 'class-record':
        // 上课记录分享图
        prompt = generateClassRecordPrompt(data);
        break;
      case 'progress':
        // 学习进度分享图
        prompt = generateProgressPrompt(data);
        break;
      case 'custom':
        // 自定义图片
        prompt = data.prompt;
        break;
      default:
        return NextResponse.json(
          { error: '不支持的图片类型' },
          { status: 400 }
        );
    }

    // 调用AI生图
    const response = await client.generate({
      prompt,
      size: '2K',
      watermark: false,
    });

    const helper = client.getResponseHelper(response);

    if (helper.success) {
      return NextResponse.json({
        success: true,
        imageUrls: helper.imageUrls,
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          errors: helper.errorMessages 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('AI生图失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '图片生成失败，请重试' 
      },
      { status: 500 }
    );
  }
}

/**
 * 生成排课信息分享图的Prompt
 */
function generateSchedulePrompt(data: any): string {
  const { studentName, courseName, teacherName, date, time, duration } = data;
  
  return `
Create a professional and visually appealing course schedule announcement card with the following design requirements:

**Overall Style:**
- Modern minimalist design with orange theme (primary colors: orange #FF6B35, amber #FFB84D, yellow #FFD93D)
- Clean layout with ample white space
- Professional education industry aesthetic
- Instagram/Social media story format (1080x1920px aspect ratio)

**Content to Display:**
- Student: ${studentName || '张三'}
- Course: ${courseName || '游戏设计基础'}
- Instructor: ${teacherName || '李老师'}
- Date: ${date || '2025-03-25'}
- Time: ${time || '18:00-20:00'}
- Duration: ${duration || '2'} hours

**Layout Requirements:**
1. Top section: Large eye-catching title "课程安排通知"
2. Middle section: Course details in elegant card format with icons
3. Bottom section: Motivational quote or school branding
4. Decorative elements: Subtle geometric patterns, gradient backgrounds

**Visual Elements:**
- Orange gradient background or accents
- Modern icons for date, time, teacher
- Elegant typography with clear hierarchy
- Decorative shapes or abstract patterns
- Professional shadow effects

**Text Style:**
- Chinese text, clean sans-serif fonts
- High contrast for readability
- Orange accent colors for key information

Generate a beautiful, shareable course schedule card that looks professional on social media platforms.
  `.trim();
}

/**
 * 生成上课记录分享图的Prompt
 */
function generateClassRecordPrompt(data: any): string {
  const { 
    studentName, 
    courseName, 
    teacherName, 
    date, 
    content, 
    performance,
    homework 
  } = data;
  
  return `
Create a professional course record summary card with the following specifications:

**Overall Style:**
- Elegant educational design with orange and warm color palette
- Clean, modern layout suitable for social sharing
- Professional photography/portfolio style aesthetic
- Square format (1:1 aspect ratio)

**Content to Display:**
- Student: ${studentName || '张三'}
- Course: ${courseName || '游戏设计基础'}
- Instructor: ${teacherName || '李老师'}
- Date: ${date || '2025-03-25'}
- Class Content: ${content || '完成了游戏角色设计的基础学习'}
- Performance: ${performance || '表现优秀，学习态度积极'}
- Homework: ${homework || '完成角色草图设计'}

**Layout Requirements:**
1. Header: "今日课程记录" with decorative elements
2. Course info section with elegant icons
3. Content summary in a clean card
4. Achievement badges or progress indicators
5. Footer with school branding

**Visual Elements:**
- Orange gradient overlays
- Modern line icons
- Achievement badges or stars
- Progress bars or completion indicators
- Subtle texture or patterns
- Professional drop shadows

**Design Details:**
- Warm, encouraging color scheme (oranges, yellows, warm whites)
- Clean card-based layout
- Visual hierarchy emphasizing key achievements
- Space for student work preview (placeholder)
- Professional typography

Generate a visually appealing course record card that celebrates student progress and can be proudly shared with parents or on social media.
  `.trim();
}

/**
 * 生成学习进度分享图的Prompt
 */
function generateProgressPrompt(data: any): string {
  const { 
    studentName, 
    totalCourses, 
    completedCourses, 
    totalHours, 
    currentStage 
  } = data;
  
  return `
Create an inspiring student progress report card with these requirements:

**Overall Style:**
- Modern dashboard-style design
- Orange and white color scheme with gradient accents
- Professional data visualization aesthetic
- Instagram story format (1080x1920px)

**Content to Display:**
- Student: ${studentName || '张三'}
- Total Courses: ${totalCourses || '10'}
- Completed: ${completedCourses || '6'}
- Total Hours: ${totalHours || '120'}
- Current Stage: ${currentStage || '项目阶段'}

**Layout Requirements:**
1. Large header with student name and achievement level
2. Progress visualization (circular progress or bar chart)
3. Key metrics in elegant cards
4. Achievement badges or milestones
5. Motivational quote or message
6. School branding

**Visual Elements:**
- Circular progress indicator showing completion percentage
- Gradient backgrounds (orange to yellow)
- Achievement icons (trophies, stars, medals)
- Data visualization charts
- Decorative geometric shapes
- Professional icons for each metric

**Design Details:**
- Celebration/motivation theme
- Clear data visualization
- Visual progress indicators
- Inspiring and encouraging tone
- Professional yet friendly appearance
- High contrast for key numbers

Generate a beautiful progress report card that makes students proud of their achievements and encourages them to keep learning.
  `.trim();
}
