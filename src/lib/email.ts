/**
 * 邮件发送服务
 * 支持 Resend API 或通用 SMTP
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 发送邮件
 * 优先使用 Resend API，否则使用 SMTP
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  const { to, subject, html, text } = options;
  const recipients = Array.isArray(to) ? to : [to];

  // 检查是否配置了 Resend API Key
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey) {
    return sendWithResend(recipients, subject, html, text);
  }

  // 检查是否配置了 SMTP
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    return sendWithSMTP(recipients, subject, html, text);
  }

  // 开发环境：模拟发送成功
  if (process.env.NODE_ENV === 'development' || process.env.COZE_PROJECT_ENV === 'DEV') {
    console.log('[DEV] 模拟发送邮件:', {
      to: recipients,
      subject,
      preview: text?.substring(0, 100) || html.substring(0, 100),
    });
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }

  return {
    success: false,
    error: '未配置邮件服务（需要 RESEND_API_KEY 或 SMTP 配置）',
  };
}

/**
 * 使用 Resend API 发送邮件
 */
async function sendWithResend(
  to: string[],
  subject: string,
  html: string,
  text?: string
): Promise<EmailResponse> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'ARTiCO <noreply@artico.com>',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Resend API 错误');
    }

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    console.error('Resend 发送失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Resend 发送失败',
    };
  }
}

/**
 * 使用 SMTP 发送邮件（通过 nodemailer 兼容方式）
 */
async function sendWithSMTP(
  to: string[],
  subject: string,
  html: string,
  text?: string
): Promise<EmailResponse> {
  // SMTP 发送需要 nodemailer 包
  // 由于沙箱环境限制，这里提供接口但不实现
  console.log('SMTP 发送:', { to, subject });
  
  return {
    success: false,
    error: 'SMTP 发送需要安装 nodemailer 包',
  };
}

/**
 * 生成签字确认邮件 HTML
 */
export function generateSignLinkEmailHtml(data: {
  studentName: string;
  teacherName: string;
  courseName: string;
  classDate: string;
  signLink: string;
  expiresIn: string;
}): string {
  const { studentName, teacherName, courseName, classDate, signLink, expiresIn } = data;

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>上课记录签字确认</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316, #f59e0b); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">ARTiCO</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">艺术留学作品集辅导</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px;">上课记录签字确认</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                尊敬的 <strong>${studentName}</strong> 同学，您好！
              </p>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                您的课程记录已填写完成，请确认以下信息并签字：
              </p>
              
              <!-- Course Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">课程名称</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">${courseName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">授课导师</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">${teacherName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">上课日期</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">${classDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${signLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f97316, #f59e0b); color: #ffffff; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 500;">
                      点击签字确认
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
                或复制链接到浏览器打开：<br/>
                <a href="${signLink}" style="color: #f97316; word-break: break-all;">${signLink}</a>
              </p>
              
              <!-- Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; margin-top: 20px; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">⚠️ 注意事项</p>
                    <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 13px; line-height: 1.6;">
                      <li>链接有效期：${expiresIn}</li>
                      <li>请在上课后当天完成签字确认</li>
                      <li>三日内未签字视为认可课程内容</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                此邮件由系统自动发送，请勿直接回复
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                © ${new Date().getFullYear()} ARTiCO 教务管理系统 · 如有疑问请联系您的规划顾问
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 生成签字确认邮件纯文本
 */
export function generateSignLinkEmailText(data: {
  studentName: string;
  teacherName: string;
  courseName: string;
  classDate: string;
  signLink: string;
  expiresIn: string;
}): string {
  const { studentName, teacherName, courseName, classDate, signLink, expiresIn } = data;

  return `
【ARTiCO】上课记录签字确认

尊敬的 ${studentName} 同学，您好！

您的课程记录已填写完成，请确认并签字：

课程名称：${courseName}
授课导师：${teacherName}
上课日期：${classDate}

签字链接：${signLink}

注意事项：
- 链接有效期：${expiresIn}
- 请在上课后当天完成签字确认
- 三日内未签字视为认可课程内容

如有疑问，请联系您的规划顾问或教务老师。

此邮件由系统自动发送，请勿直接回复。
© ${new Date().getFullYear()} ARTiCO 教务管理系统
  `.trim();
}
