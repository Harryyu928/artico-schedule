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
    const body = await request.json();
    const { prompt, size } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: '缺少必需参数: prompt' },
        { status: 400 }
      );
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
