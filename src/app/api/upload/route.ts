/**
 * 文件上传 API
 * 
 * POST /api/upload - 上传文件到对象存储
 * GET /api/upload?key=xxx - 获取文件签名URL
 * DELETE /api/upload?key=xxx - 删除文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// POST - 上传文件
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'class-records'; // 默认存储在 class-records 文件夹
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '未找到文件' },
        { status: 400 }
      );
    }

    // 验证文件类型（允许图片、PDF、文档等）
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的文件类型' },
        { status: 400 }
      );
    }

    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '文件大小不能超过 10MB' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // 生成文件名（保留原始扩展名）
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${folder}/${timestamp}_${originalName}`;

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: fileBuffer,
      fileName,
      contentType: file.type,
    });

    // 生成签名URL（有效期7天）
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 7 * 24 * 60 * 60, // 7天
    });

    return NextResponse.json({
      success: true,
      data: {
        key: fileKey,
        url: signedUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      },
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { success: false, error: '文件上传失败' },
      { status: 500 }
    );
  }
}

// GET - 获取文件签名URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const expireTime = parseInt(searchParams.get('expireTime') || '604800'); // 默认7天

    if (!key) {
      return NextResponse.json(
        { success: false, error: '缺少文件key参数' },
        { status: 400 }
      );
    }

    // 检查文件是否存在
    const exists = await storage.fileExists({ fileKey: key });
    if (!exists) {
      return NextResponse.json(
        { success: false, error: '文件不存在' },
        { status: 404 }
      );
    }

    // 生成签名URL
    const signedUrl = await storage.generatePresignedUrl({
      key,
      expireTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        key,
        url: signedUrl,
      },
    });
  } catch (error) {
    console.error('获取文件URL失败:', error);
    return NextResponse.json(
      { success: false, error: '获取文件URL失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除文件
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: '缺少文件key参数' },
        { status: 400 }
      );
    }

    // 删除文件
    const success = await storage.deleteFile({ fileKey: key });

    return NextResponse.json({
      success,
      message: success ? '文件删除成功' : '文件删除失败',
    });
  } catch (error) {
    console.error('文件删除失败:', error);
    return NextResponse.json(
      { success: false, error: '文件删除失败' },
      { status: 500 }
    );
  }
}
