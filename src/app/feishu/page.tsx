'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Send, 
  Calendar, 
  Table, 
  Bell,
  MessageSquare,
  Users,
  Settings,
  ExternalLink,
  Copy,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// 飞书集成状态
interface FeishuStatus {
  enabled: boolean;
  appId: string;
  hasAppSecret: boolean;
  hasAppToken: boolean;
  calendarId: string;
}

// 同步统计
interface SyncStats {
  students: { total: number; synced: number };
  teachers: { total: number; synced: number };
  courses: { total: number; synced: number };
}

export default function FeishuIntegrationPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<FeishuStatus | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // 配置表单
  const [config, setConfig] = useState({
    appId: '',
    appSecret: '',
    appToken: '',
    calendarId: '',
  });

  // 测试消息
  const [testMessage, setTestMessage] = useState({
    openId: '',
    message: '这是一条测试消息，来自ARTiCO自动排课系统。',
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/feishu/status');
      const data = await response.json();
      setStatus(data);
      if (data.config) {
        setConfig({
          appId: data.config.appId || '',
          appSecret: '',
          appToken: '',
          calendarId: data.config.calendarId || '',
        });
      }
    } catch (error) {
      console.error('获取状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (type: 'students' | 'teachers' | 'all') => {
    setSyncing(true);
    try {
      const response = await fetch('/api/feishu/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: '同步成功',
          description: `成功同步 ${result.success} 条记录，失败 ${result.failed} 条`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '同步失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testMessage.openId) {
      toast({
        title: '请输入接收者ID',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      const response = await fetch('/api/feishu/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage),
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: '测试消息发送成功',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '发送失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const response = await fetch('/api/feishu/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: '配置已保存',
        });
        fetchStatus();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '保存失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '已复制到剪贴板',
    });
  };

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/feishu/webhook`
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">飞书集成管理</h1>
          <p className="text-muted-foreground">配置和管理飞书集成功能</p>
        </div>
      </div>

      {/* 状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">集成状态</p>
                <p className="text-xl font-semibold">
                  {status?.enabled ? '已启用' : '未启用'}
                </p>
              </div>
              {status?.enabled ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-gray-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">消息通知</p>
                <p className="text-xl font-semibold">已配置</p>
              </div>
              <Bell className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">日历同步</p>
                <p className="text-xl font-semibold">
                  {status?.calendarId ? '已配置' : '未配置'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">多维表格</p>
                <p className="text-xl font-semibold">
                  {status?.hasAppToken ? '已配置' : '未配置'}
                </p>
              </div>
              <Table className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 配置选项卡 */}
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">基础配置</TabsTrigger>
          <TabsTrigger value="sync">数据同步</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="test">测试工具</TabsTrigger>
        </TabsList>

        {/* 基础配置 */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>飞书应用配置</CardTitle>
              <CardDescription>
                配置飞书应用凭证，启用飞书集成功能。
                <a 
                  href="https://open.feishu.cn/app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-orange-500 hover:underline inline-flex items-center"
                >
                  前往飞书开放平台 <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="appId">App ID</Label>
                  <Input
                    id="appId"
                    placeholder="cli_xxxxxxxxxxxx"
                    value={config.appId}
                    onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appSecret">App Secret</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    placeholder="输入新的密钥"
                    value={config.appSecret}
                    onChange={(e) => setConfig({ ...config, appSecret: e.target.value })}
                  />
                  {status?.hasAppSecret && (
                    <p className="text-xs text-muted-foreground">已配置，留空则保持不变</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appToken">多维表格 App Token</Label>
                  <Input
                    id="appToken"
                    placeholder="bascnxxxxxxxxxx"
                    value={config.appToken}
                    onChange={(e) => setConfig({ ...config, appToken: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">用于多维表格数据同步</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calendarId">日历 ID</Label>
                  <Input
                    id="calendarId"
                    placeholder="ou_xxxxxxxxxxxx"
                    value={config.calendarId}
                    onChange={(e) => setConfig({ ...config, calendarId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">课程安排同步到此日历</p>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={fetchStatus}>
                  重置
                </Button>
                <Button onClick={handleSaveConfig}>
                  保存配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据同步 */}
        <TabsContent value="sync">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  学生数据
                </CardTitle>
                <CardDescription>
                  同步学生信息到飞书多维表格
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>同步学生基本信息、课时统计等数据</p>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => handleSync('students')}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    同步学生数据
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  导师数据
                </CardTitle>
                <CardDescription>
                  同步导师信息到飞书多维表格
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>同步导师信息、可授课程、课时统计等</p>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => handleSync('teachers')}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    同步导师数据
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  全量同步
                </CardTitle>
                <CardDescription>
                  同步所有数据到飞书
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>同步学生、导师、课程、上课记录等全部数据</p>
                  </div>
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => handleSync('all')}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    全量同步
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Webhook配置 */}
        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle>Webhook 配置</CardTitle>
              <CardDescription>
                配置飞书事件订阅，接收飞书推送的事件消息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookUrl} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => copyToClipboard(webhookUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">配置说明</p>
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-yellow-700">
                        <li>将上述URL配置到飞书开放平台的事件订阅中</li>
                        <li>添加需要订阅的事件类型</li>
                        <li>配置Encrypt Key和Verification Token（可选）</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>支持的事件类型</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">消息接收</Badge>
                    <Badge variant="outline">用户创建</Badge>
                    <Badge variant="outline">用户更新</Badge>
                    <Badge variant="outline">审批实例</Badge>
                    <Badge variant="outline">日历事件</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 测试工具 */}
        <TabsContent value="test">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  发送测试消息
                </CardTitle>
                <CardDescription>
                  向指定用户发送测试消息
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testOpenId">接收者 Open ID</Label>
                  <Input
                    id="testOpenId"
                    placeholder="ou_xxxxxxxxxxxx"
                    value={testMessage.openId}
                    onChange={(e) => setTestMessage({ ...testMessage, openId: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testMsg">消息内容</Label>
                  <Textarea
                    id="testMsg"
                    placeholder="输入测试消息..."
                    value={testMessage.message}
                    onChange={(e) => setTestMessage({ ...testMessage, message: e.target.value })}
                  />
                </div>

                <Button 
                  className="w-full"
                  onClick={handleTestMessage}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  发送测试消息
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  通知测试
                </CardTitle>
                <CardDescription>
                  测试各类通知功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      toast({
                        title: '测试排课通知',
                        description: '请通过API测试完整的排课通知流程',
                      });
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    测试排课通知
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      toast({
                        title: '测试课程提醒',
                        description: '请通过API测试完整的课程提醒流程',
                      });
                    }}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    测试课程提醒
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      toast({
                        title: '测试审批通知',
                        description: '请通过API测试完整的审批通知流程',
                      });
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    测试审批通知
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">1. 飞书应用配置</h4>
              <p className="text-muted-foreground">
                在飞书开放平台创建企业自建应用，获取App ID和App Secret，配置到本系统。
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. 权限配置</h4>
              <p className="text-muted-foreground">
                在飞书应用管理中开通以下权限：获取用户信息、发送消息、日历读写、多维表格读写。
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. 事件订阅</h4>
              <p className="text-muted-foreground">
                配置Webhook URL，订阅消息接收、用户变更等事件。
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. 数据同步</h4>
              <p className="text-muted-foreground">
                配置多维表格App Token后，可同步学生、导师等数据到飞书多维表格。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
