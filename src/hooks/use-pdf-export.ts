/**
 * PDF 导出 Hook
 * 提供通用的 PDF 生成和下载功能
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UsePDFExportOptions {
  documentType: 'class-record' | 'selection-form' | 'schedule' | 'timetable' | 'workflow';
  onSuccess?: (data: { pdfUrl: string; signLink?: string }) => void;
  onError?: (error: string) => void;
}

interface PDFExportResult {
  success: boolean;
  data?: {
    pdfKey: string;
    pdfUrl: string;
    signLink?: string;
  };
  error?: string;
}

export function usePDFExport({ documentType, onSuccess, onError }: UsePDFExportOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [signLink, setSignLink] = useState<string | null>(null);

  // API 路径映射
  const getApiPath = (id: string): string => {
    const paths: Record<string, string> = {
      'class-record': `/api/class-records/${id}/pdf`,
      'selection-form': `/api/selection-forms/${id}/pdf`,
      'schedule': `/api/schedule/${id}/pdf`,
      'timetable': `/api/time-table/student/${id}/pdf`,
      'workflow': `/api/workflows/instances/${id}/pdf`,
    };
    return paths[documentType];
  };

  // 生成 PDF
  const generatePDF = useCallback(async (id: string): Promise<PDFExportResult | null> => {
    setIsGenerating(true);
    
    try {
      const apiPath = getApiPath(id);
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'PDF 生成失败');
      }

      setPdfUrl(result.data.pdfUrl);
      if (result.data.signLink) {
        setSignLink(result.data.signLink);
      }

      toast.success('PDF 生成成功');
      onSuccess?.(result.data);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF 生成失败';
      toast.error(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [documentType, onSuccess, onError]);

  // 获取现有 PDF
  const getExistingPDF = useCallback(async (id: string): Promise<string | null> => {
    try {
      const apiPath = getApiPath(id);
      const response = await fetch(apiPath, {
        method: 'GET',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return null;
      }

      return result.data.pdfUrl;
    } catch (error) {
      return null;
    }
  }, [documentType]);

  // 下载 PDF
  const downloadPDF = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success('PDF 下载成功');
    } catch (error) {
      toast.error('PDF 下载失败');
    }
  }, []);

  // 一键生成并下载
  const generateAndDownload = useCallback(async (id: string, filename?: string) => {
    const result = await generatePDF(id);
    
    if (result?.data?.pdfUrl) {
      const defaultFilename = `${documentType}_${id}_${Date.now()}.pdf`;
      await downloadPDF(result.data.pdfUrl, filename || defaultFilename);
    }
    
    return result;
  }, [generatePDF, downloadPDF, documentType]);

  return {
    isGenerating,
    pdfUrl,
    signLink,
    generatePDF,
    getExistingPDF,
    downloadPDF,
    generateAndDownload,
  };
}

// 默认导出
export default usePDFExport;
