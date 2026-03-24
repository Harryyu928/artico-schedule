import { NextRequest, NextResponse } from 'next/server';
import { generateImage, extractForwardHeaders } from '@/lib/ai-image-client';

/**
 * POST /api/generate-image
 * 生成AI图片
 * 
 * Body:
 * - prompt: string - 图片描述
 * - size?: string - 图片尺寸 (2K, 4K, 或 WIDTHxHEIGHT)
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: '请求体格式错误，请提供有效的JSON' },
        { status: 400 }
      );
    }
    
    const { prompt, size } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: '缺少必需参数: prompt' },
        { status: 400 }
      );
    }

    // 验证尺寸参数
    if (size && !['2K', '4K'].includes(size)) {
      // 自定义尺寸必须在 [2560x1440, 4096x4096] 范围内
      if (!/^\d+x\d+$/.test(size)) {
        return NextResponse.json(
          { error: '尺寸参数格式错误，支持: 2K, 4K, 或 WIDTHxHEIGHT 格式' },
          { status: 400 }
        );
      }
    }

    // 提取转发头信息
    const customHeaders = extractForwardHeaders(request.headers);

    // 调用AI生图
    const result = await generateImage({
      prompt,
      size: size || '2K',
      customHeaders,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        urls: result.urls,
      });
    } else {
      return NextResponse.json(
        { error: result.error || '图片生成失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('图片生成API错误:', error);
    return NextResponse.json(
      { error: '图片生成失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}
