/**
 * PDF 导出按钮组件
 * 通用组件，用于各类过程文件的 PDF 导出
 */

'use client';

import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  FileDown, 
  FileText, 
  Link2, 
  Loader2, 
  MoreHorizontal,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { usePDFExport } from '@/hooks/use-pdf-export';
import { useState } from 'react';
import { toast } from 'sonner';

type DocumentType = 'class-record' | 'selection-form' | 'schedule' | 'timetable' | 'workflow';

interface PDFExportButtonProps {
  documentType: DocumentType;
  documentId: string;
  documentName?: string;
  hasSignature?: boolean;
  showSignLink?: boolean;
  variant?: 'button' | 'dropdown' | 'icon';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onGenerated?: (data: { pdfUrl: string; signLink?: string }) => void;
}

// 文档类型名称映射
const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  'class-record': '上课记录',
  'selection-form': '选课单',
  'schedule': '排课确认单',
  'timetable': '时间表',
  'workflow': '任务清单',
};

export function PDFExportButton({
  documentType,
  documentId,
  documentName,
  hasSignature = true,
  showSignLink = true,
  variant = 'button',
  size = 'default',
  className = '',
  onGenerated,
}: PDFExportButtonProps) {
  const [signLinkCopied, setSignLinkCopied] = useState(false);
  
  const {
    isGenerating,
    pdfUrl,
    signLink,
    generatePDF,
    generateAndDownload,
    downloadPDF,
  } = usePDFExport({
    documentType,
    onSuccess: onGenerated,
  });

  // 复制签字链接
  const copySignLink = async () => {
    if (signLink) {
      await navigator.clipboard.writeText(signLink);
      setSignLinkCopied(true);
      toast.success('签字链接已复制');
      setTimeout(() => setSignLinkCopied(false), 2000);
    }
  };

  // 发送签字链接（需要邮件服务）
  const sendSignLink = async () => {
    // TODO: 集成邮件发送服务
    toast.info('邮件发送功能开发中');
  };

  // 简单按钮模式
  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        disabled={isGenerating}
        onClick={() => generateAndDownload(documentId)}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4 mr-2" />
        )}
        导出PDF
      </Button>
    );
  }

  // 图标按钮模式
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        disabled={isGenerating}
        onClick={() => generateAndDownload(documentId)}
        title="导出PDF"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
      </Button>
    );
  }

  // 下拉菜单模式（完整功能）
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={className}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          {DOCUMENT_TYPE_NAMES[documentType]}PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => generateAndDownload(documentId)}>
          <FileDown className="h-4 w-4 mr-2" />
          生成并下载PDF
        </DropdownMenuItem>
        
        {pdfUrl && (
          <DropdownMenuItem onClick={() => downloadPDF(pdfUrl, `${documentType}_${documentId}.pdf`)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            下载已生成的PDF
          </DropdownMenuItem>
        )}

        {hasSignature && showSignLink && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => generatePDF(documentId).then(() => {})} disabled={isGenerating}>
              <Link2 className="h-4 w-4 mr-2" />
              生成PDF（含签字链接）
            </DropdownMenuItem>
            
            {signLink && (
              <>
                <DropdownMenuItem onClick={copySignLink}>
                  {signLinkCopied ? (
                    <span className="text-green-600">✓ 已复制</span>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      复制签字链接
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={sendSignLink}>
                  <Mail className="h-4 w-4 mr-2" />
                  发送签字链接邮件
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 默认导出
export default PDFExportButton;
