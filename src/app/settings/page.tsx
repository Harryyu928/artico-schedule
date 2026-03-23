'use client';

import { useState } from 'react';
import { 
  Settings,
  Bell,
  Moon,
  Globe,
  Database,
  MessageSquare,
  Save,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // 系统设置
  const [systemSettings, setSystemSettings] = useState({
    siteName: 'ARTDiCO 排课系统',
    siteDescription: '智能教务管理系统',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
  });

  // 通知设置
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    feishuEnabled: true,
    wechatEnabled: false,
    scheduleReminder: true,
    classRecordReminder: true,
    approvalNotification: true,
  });

  // 飞书集成
  const [feishuSettings, setFeishuSettings] = useState({
    appId: '',
    appSecret: '',
    appToken: '',
    enabled: false,
  });

  // 数据库设置
  const [databaseSettings, setDatabaseSettings] = useState({
    databaseUrl: '',
    connectionPool: 10,
    connectionTimeout: 5000,
  });

  // 保存设置
  const handleSave = async () => {
    try {
      setLoading(true);
      
      // 这里应该调用API保存设置
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: '成功',
        description: '设置已保存',
      });
    } catch (error) {
      console.error('保存失败:', error);
      toast({
        title: '错误',
        description: '保存失败，请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">系统设置</h1>
        <p className="text-gray-500 mt-1">管理系统配置和集成设置</p>
      </div>

      {/* 系统设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>系统设置</CardTitle>
          </div>
          <CardDescription>配置系统基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">站点名称</Label>
              <Input
                id="siteName"
                value={systemSettings.siteName}
                onChange={(e) => setSystemSettings({ ...systemSettings, siteName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">站点描述</Label>
              <Input
                id="siteDescription"
                value={systemSettings.siteDescription}
                onChange={(e) => setSystemSettings({ ...systemSettings, siteDescription: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">语言</Label>
              <Select
                value={systemSettings.language}
                onValueChange={(value) => setSystemSettings({ ...systemSettings, language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">时区</Label>
              <Select
                value={systemSettings.timezone}
                onValueChange={(value) => setSystemSettings({ ...systemSettings, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Shanghai">上海 (GMT+8)</SelectItem>
                  <SelectItem value="Asia/Tokyo">东京 (GMT+9)</SelectItem>
                  <SelectItem value="America/New_York">纽约 (GMT-5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 通知设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>通知设置</CardTitle>
          </div>
          <CardDescription>配置系统通知方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>邮件通知</Label>
                <p className="text-sm text-gray-500">通过邮件发送通知</p>
              </div>
              <Switch
                checked={notificationSettings.emailEnabled}
                onCheckedChange={(checked) => 
                  setNotificationSettings({ ...notificationSettings, emailEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>短信通知</Label>
                <p className="text-sm text-gray-500">通过短信发送通知</p>
              </div>
              <Switch
                checked={notificationSettings.smsEnabled}
                onCheckedChange={(checked) => 
                  setNotificationSettings({ ...notificationSettings, smsEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>飞书通知</Label>
                <p className="text-sm text-gray-500">通过飞书发送通知（全职导师）</p>
              </div>
              <Switch
                checked={notificationSettings.feishuEnabled}
                onCheckedChange={(checked) => 
                  setNotificationSettings({ ...notificationSettings, feishuEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>微信通知</Label>
                <p className="text-sm text-gray-500">通过微信发送通知（兼职导师和学生）</p>
              </div>
              <Switch
                checked={notificationSettings.wechatEnabled}
                onCheckedChange={(checked) => 
                  setNotificationSettings({ ...notificationSettings, wechatEnabled: checked })
                }
              />
            </div>

            <hr />

            <div className="flex items-center justify-between">
              <div>
                <Label>上课提醒</Label>
                <p className="text-sm text-gray-500">课前自动发送提醒通知</p>
              </div>
              <Switch
                checked={notificationSettings.scheduleReminder}
                onCheckedChange={(checked) => 
                  setNotificationSettings({ ...notificationSettings, scheduleReminder: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>上课记录填写提醒</Label>
                <p className="text-sm text-gray-500">课后提醒导师填写记录</p>
              </div>
              <Switch
                checked={notificationSettings.classRecordReminder}
                onCheckedChange={(checked) => 
                  setNotificationSettings({ ...notificationSettings, classRecordReminder: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>审批通知</Label>
                <p className="text-sm text-gray-500">审批流程变化时发送通知</p>
              </div>
              <Switch
                checked={notificationSettings.approvalNotification}
                onCheckedChange={(checked) => 
                  setNotificationSettings({ ...notificationSettings, approvalNotification: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 飞书集成 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>飞书集成</CardTitle>
          </div>
          <CardDescription>配置飞书开放平台集成</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label>启用飞书集成</Label>
              <p className="text-sm text-gray-500">开启后将启用飞书相关功能</p>
            </div>
            <Switch
              checked={feishuSettings.enabled}
              onCheckedChange={(checked) => 
                setFeishuSettings({ ...feishuSettings, enabled: checked })
              }
            />
          </div>

          {feishuSettings.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="feishuAppId">App ID</Label>
                <Input
                  id="feishuAppId"
                  type="password"
                  placeholder="请输入飞书应用ID"
                  value={feishuSettings.appId}
                  onChange={(e) => setFeishuSettings({ ...feishuSettings, appId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feishuAppSecret">App Secret</Label>
                <Input
                  id="feishuAppSecret"
                  type="password"
                  placeholder="请输入飞书应用密钥"
                  value={feishuSettings.appSecret}
                  onChange={(e) => setFeishuSettings({ ...feishuSettings, appSecret: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feishuAppToken">App Token</Label>
                <Input
                  id="feishuAppToken"
                  type="password"
                  placeholder="请输入多维表格Token"
                  value={feishuSettings.appToken}
                  onChange={(e) => setFeishuSettings({ ...feishuSettings, appToken: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  测试连接
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 数据库设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>数据库设置</CardTitle>
          </div>
          <CardDescription>配置数据库连接信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="databaseUrl">数据库连接URL</Label>
            <Input
              id="databaseUrl"
              type="password"
              placeholder="请输入数据库连接URL"
              value={databaseSettings.databaseUrl}
              onChange={(e) => setDatabaseSettings({ ...databaseSettings, databaseUrl: e.target.value })}
            />
            <p className="text-sm text-gray-500">
              支持PostgreSQL数据库连接字符串
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="connectionPool">连接池大小</Label>
              <Input
                id="connectionPool"
                type="number"
                value={databaseSettings.connectionPool}
                onChange={(e) => setDatabaseSettings({ ...databaseSettings, connectionPool: parseInt(e.target.value) || 10 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connectionTimeout">连接超时（毫秒）</Label>
              <Input
                id="connectionTimeout"
                type="number"
                value={databaseSettings.connectionTimeout}
                onChange={(e) => setDatabaseSettings({ ...databaseSettings, connectionTimeout: parseInt(e.target.value) || 5000 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  );
}
