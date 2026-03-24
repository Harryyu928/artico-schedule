/**
 * 数据导入页面
 * 
 * 路由: /import
 * 支持批量导入学生、导师、课程数据
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, FileText, Users, GraduationCap, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type ImportType = 'students' | 'teachers' | 'courses';

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    success: number;
    failed: number;
    errors: string[];
  };
}

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('students');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // 导入类型配置
  const importTypes: Array<{
    type: ImportType;
    label: string;
    icon: React.ReactNode;
    description: string;
    templateFile: string;
    requiredFields: string[];
  }> = [
    {
      type: 'students',
      label: '学生',
      icon: <Users className="w-5 h-5" />,
      description: '批量导入学生信息，包括学号、姓名、专业等',
      templateFile: 'templates/学生导入模板.csv',
      requiredFields: ['学号', '姓名', '专业方向', '申请国家', '当前阶段', '总课时'],
    },
    {
      type: 'teachers',
      label: '导师',
      icon: <GraduationCap className="w-5 h-5" />,
      description: '批量导入导师信息，包括工号、姓名、可授课程等',
      templateFile: 'templates/导师导入模板.csv',
      requiredFields: ['工号', '姓名', '类型', '可教授课程', '每周最大课时'],
    },
    {
      type: 'courses',
      label: '课程',
      icon: <BookOpen className="w-5 h-5" />,
      description: '批量导入课程信息，包括课程编号、名称、分类等',
      templateFile: 'templates/课程导入模板.csv',
      requiredFields: ['课程编号', '课程名称', '课程类型', '课程分类', '时长'],
    },
  ];

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        alert('请选择 CSV 格式的文件');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = `/api/import/template/${importType}`;
    link.download = `${currentType.label}导入模板.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 处理导入
  const handleImport = async () => {
    if (!file) {
      alert('请先选择文件');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/import/${importType}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      setFile(null);

      // 清空文件输入
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error) {
      setResult({
        success: false,
        message: `导入失败: ${(error as Error).message}`,
      });
    } finally {
      setUploading(false);
    }
  };

  // 获取当前类型配置
  const currentType = importTypes.find(t => t.type === importType)!;

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📥 数据批量导入</h1>
        <p className="text-muted-foreground mt-1">
          使用 CSV 文件批量导入学生、导师、课程数据
        </p>
      </div>

      {/* 使用步骤 */}
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <h3 className="font-semibold text-orange-800 mb-3">📋 导入步骤</h3>
          <ol className="text-sm text-orange-700 space-y-2 list-decimal list-inside">
            <li><strong>下载模板</strong> - 点击下方"下载模板"按钮获取 CSV 模板文件</li>
            <li><strong>填写数据</strong> - 用 Excel 打开模板，按表头填写数据</li>
            <li><strong>选择类型</strong> - 选择要导入的数据类型（学生/导师/课程）</li>
            <li><strong>上传文件</strong> - 点击"选择文件"上传填好的 CSV 文件</li>
            <li><strong>开始导入</strong> - 点击"开始导入"按钮，等待导入完成</li>
          </ol>
        </CardContent>
      </Card>

      {/* 选择导入类型 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">1️⃣ 选择导入类型</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {importTypes.map((item) => (
              <div
                key={item.type}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  importType === item.type
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
                onClick={() => {
                  setImportType(item.type);
                  setFile(null);
                  setResult(null);
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${
                    importType === item.type ? 'bg-orange-500 text-white' : 'bg-gray-100'
                  }`}>
                    {item.icon}
                  </div>
                  <span className="font-semibold">{item.label}导入</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          {/* 必填字段提示 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-2">必填字段：</p>
            <div className="flex flex-wrap gap-2">
              {currentType.requiredFields.map((field) => (
                <Badge key={field} variant="outline" className="bg-white">
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 下载模板和上传文件 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* 下载模板 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2️⃣ 下载模板</CardTitle>
            <CardDescription>下载 CSV 模板文件，用 Excel 填写数据</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              下载 {currentType.label}导入模板
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              模板文件: {currentType.templateFile}
            </p>
          </CardContent>
        </Card>

        {/* 上传文件 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3️⃣ 上传文件</CardTitle>
            <CardDescription>选择填好的 CSV 文件进行上传</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file-input"
                  className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 border-gray-300"
                >
                  <div className="flex flex-col items-center justify-center pt-2">
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <p className="text-sm text-gray-500">
                      {file ? file.name : '点击选择 CSV 文件'}
                    </p>
                  </div>
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              
              {file && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">{file.name}</span>
                  <Badge variant="outline" className="ml-auto">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 导入按钮 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">准备好了吗？</p>
              <p className="text-sm text-muted-foreground">
                {file 
                  ? `即将导入: ${file.name}` 
                  : '请先选择要导入的文件'}
              </p>
            </div>
            <Button
              onClick={handleImport}
              disabled={!file || uploading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  导入中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  开始导入
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 导入结果 */}
      {result && (
        <Card className={`mb-6 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {result.success ? (
                <><CheckCircle className="w-5 h-5 text-green-600" /> 导入完成</>
              ) : (
                <><XCircle className="w-5 h-5 text-red-600" /> 导入失败</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              {result.message}
            </p>
            
            {result.results && (
              <div className="mt-4 space-y-3">
                {/* 统计 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.results.success}</div>
                    <div className="text-sm text-muted-foreground">成功导入</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{result.results.failed}</div>
                    <div className="text-sm text-muted-foreground">导入失败</div>
                  </div>
                </div>

                {/* 成功率 */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>成功率</span>
                    <span>
                      {((result.results.success / (result.results.success + result.results.failed)) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={(result.results.success / (result.results.success + result.results.failed)) * 100} 
                    className="h-2"
                  />
                </div>

                {/* 错误列表 */}
                {result.results.errors.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="font-medium text-orange-700">错误详情：</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.results.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-white p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 注意事项 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">⚠️ 注意事项</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• 文件必须是 <strong>CSV 格式</strong>（Excel 可另存为 CSV）</li>
            <li>• 第一行为表头，不要修改或删除</li>
            <li>• 学号/工号/课程编号不能重复</li>
            <li>• 如果导入失败，请检查数据格式是否正确</li>
            <li>• 推荐使用 <strong>UTF-8 编码</strong>保存文件</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
