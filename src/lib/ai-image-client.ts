/**
 * AI 图片生成客户端
 * 封装 coze-coding-dev-sdk 的图片生成功能
 * 
 * IMPORTANT: 此文件必须在后端使用，不要在客户端代码中导入
 */

import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export interface GenerateImageOptions {
  prompt: string;
  size?: '2K' | '4K' | string; // 也可以是 "WIDTHxHEIGHT" 格式
  watermark?: boolean;
  customHeaders?: Record<string, string>;
}

export interface GenerateImageResult {
  success: boolean;
  url?: string;
  urls?: string[];
  error?: string;
}

/**
 * 生成单张图片
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config, options.customHeaders);

    const response = await client.generate({
      prompt: options.prompt,
      size: options.size || '2K',
      watermark: options.watermark ?? false,
    });

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.imageUrls.length > 0) {
      return {
        success: true,
        url: helper.imageUrls[0],
        urls: helper.imageUrls,
      };
    } else {
      return {
        success: false,
        error: helper.errorMessages.join('; ') || '生成失败',
      };
    }
  } catch (error) {
    console.error('AI图片生成失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 批量生成图片
 */
export async function batchGenerateImages(
  prompts: Array<{ prompt: string; size?: string }>
): Promise<GenerateImageResult[]> {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config);

    const requests = prompts.map(p => ({
      prompt: p.prompt,
      size: p.size || '2K',
    }));

    const responses = await client.batchGenerate(requests);

    return responses.map(response => {
      const helper = client.getResponseHelper(response);
      
      if (helper.success && helper.imageUrls.length > 0) {
        return {
          success: true,
          url: helper.imageUrls[0],
          urls: helper.imageUrls,
        };
      } else {
        return {
          success: false,
          error: helper.errorMessages.join('; ') || '生成失败',
        };
      }
    });
  } catch (error) {
    console.error('批量生成图片失败:', error);
    return prompts.map(() => ({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }));
  }
}

/**
 * 从请求头提取转发头信息
 * 用于 Next.js API 路由
 */
export function extractForwardHeaders(headers: Headers): Record<string, string> {
  return HeaderUtils.extractForwardHeaders(headers);
}
