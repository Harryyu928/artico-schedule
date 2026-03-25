/**
 * PDF 生成工具
 * 用于生成上课记录 PDF 文件
 */

import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { S3Storage } from 'coze-coding-dev-sdk';
import { ClassRecordPDF, ClassRecordPDFData } from './pdf-template';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

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
 * 生成上课记录 PDF
 * @param recordData 上课记录数据
 * @returns PDF 文件的 Buffer
 */
export async function generateClassRecordPDF(
  recordData: ClassRecordPDFData
): Promise<Buffer> {
  try {
    // 生成二维码
    let qrCodeDataUrl = '';
    if (recordData.signLink && !recordData.studentSignature) {
      qrCodeDataUrl = await generateQRCodeDataUrl(recordData.signLink);
    }

    // 准备 PDF 数据
    const pdfData: ClassRecordPDFData = {
      ...recordData,
      qrCodeDataUrl,
    };

    // 渲染 PDF
    const pdfBuffer = await renderToBuffer(<ClassRecordPDF data={pdfData} />);

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('生成PDF失败:', error);
    throw new Error('PDF生成失败');
  }
}

/**
 * 生成 PDF 并上传到对象存储
 * @param recordData 上课记录数据
 * @returns 上传后的文件 key 和签名 URL
 */
export async function generateAndUploadPDF(
  recordData: ClassRecordPDFData
): Promise<{ key: string; url: string }> {
  try {
    // 生成 PDF
    const pdfBuffer = await generateClassRecordPDF(recordData);

    // 生成文件名
    const fileName = `class-records/pdf/${recordData.recordId}_${Date.now()}.pdf`;

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: pdfBuffer,
      fileName,
      contentType: 'application/pdf',
    });

    // 生成签名 URL（有效期30天）
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 30 * 24 * 60 * 60, // 30天
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
 * 获取 PDF 签名 URL
 * @param fileKey 文件 key
 * @param expireTime 过期时间（秒）
 * @returns 签名 URL
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
