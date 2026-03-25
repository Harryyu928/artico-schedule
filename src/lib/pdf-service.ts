/**
 * 通用 PDF 导出服务
 * 统一管理所有过程文件的 PDF 生成、上传和签字功能
 */

import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { S3Storage } from 'coze-coding-dev-sdk';
import { ReactElement } from 'react';
import { Document } from '@react-pdf/renderer';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 文档类型定义
export type DocumentType = 
  | 'class-record'        // 上课记录
  | 'selection-form'      // 选课单
  | 'schedule'            // 排课确认单
  | 'timetable'           // 时间表
  | 'workflow';           // 工作流任务清单

// 文档类型中文名映射
export const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  'class-record': '上课记录',
  'selection-form': '选课单',
  'schedule': '排课确认单',
  'timetable': '时间表',
  'workflow': '任务清单',
};

// 需要签字的文档类型
export const SIGNABLE_DOCUMENT_TYPES: DocumentType[] = [
  'class-record',
  'selection-form',
  'schedule',
];

// 通用PDF数据接口
export interface BasePDFData {
  documentType: DocumentType;
  documentId: string;
  generatedAt: string;
}

// 签字信息
export interface SignatureInfo {
  signToken?: string;
  signLink?: string;
  signLinkExpiresAt?: string;
  signature?: string;
  signatureTime?: string;
  qrCodeDataUrl?: string;
}

/**
 * 生成二维码 Data URL
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (error) {
    console.error('生成二维码失败:', error);
    return '';
  }
}

/**
 * 生成签字Token
 */
export function generateSignToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * 计算签字链接过期时间（默认7天）
 */
export function calculateSignTokenExpiry(days: number = 7): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/**
 * 生成PDF并上传到对象存储
 * @param documentType 文档类型
 * @param documentId 文档ID
 * @param pdfElement PDF React元素
 * @param signatureInfo 签字信息（可选）
 */
export async function generateAndUploadPDF(
  documentType: DocumentType,
  documentId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfElement: ReactElement<any>,
  signatureInfo?: SignatureInfo
): Promise<{ key: string; url: string }> {
  try {
    // 渲染 PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    // 生成文件名
    const fileName = `${documentType}s/pdf/${documentId}_${Date.now()}.pdf`;

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: Buffer.from(pdfBuffer),
      fileName,
      contentType: 'application/pdf',
    });

    // 生成签名 URL（有效期30天）
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 30 * 24 * 60 * 60,
    });

    return {
      key: fileKey,
      url: signedUrl,
    };
  } catch (error) {
    console.error('生成并上传PDF失败:', error);
    throw error;
  }
}

/**
 * 获取PDF签名URL
 */
export async function getPDFSignedUrl(
  fileKey: string,
  expireTime: number = 30 * 24 * 60 * 60
): Promise<string> {
  try {
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime,
    });
    return signedUrl;
  } catch (error) {
    console.error('获取PDF签名URL失败:', error);
    throw error;
  }
}

/**
 * 准备签字信息
 * 用于需要签字的文档
 */
export async function prepareSignatureInfo(
  existingToken?: string,
  existingSignature?: string,
  existingSignatureTime?: Date,
  domain?: string
): Promise<SignatureInfo> {
  const baseUrl = domain || process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
  
  // 如果已签字，返回签字信息
  if (existingSignature && existingSignatureTime) {
    return {
      signature: existingSignature,
      signatureTime: new Date(existingSignatureTime).toLocaleString('zh-CN'),
    };
  }

  // 生成新的签字链接
  const signToken = existingToken || generateSignToken();
  const signLink = `${baseUrl}/sign/${signToken}`;
  const qrCodeDataUrl = await generateQRCodeDataUrl(signLink);
  const signLinkExpiresAt = calculateSignTokenExpiry(7).toISOString();

  return {
    signToken,
    signLink,
    signLinkExpiresAt,
    qrCodeDataUrl,
  };
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化时间段
 */
export function formatTimeSlot(startTime: string, endTime?: string): string {
  if (endTime) {
    return `${startTime} - ${endTime}`;
  }
  return startTime;
}

/**
 * 计算课时进度百分比
 */
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * 生成文档编号
 */
export function generateDocumentId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * 批量生成PDF
 */
export async function batchGeneratePDFs<T>(
  items: T[],
  generator: (item: T) => Promise<{ key: string; url: string }>
): Promise<Array<{ item: T; result?: { key: string; url: string }; error?: string }>> {
  const results = await Promise.allSettled(
    items.map(async (item) => {
      const result = await generator(item);
      return { item, result };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        item: items[index],
        error: result.reason?.message || '生成失败',
      };
    }
  });
}
