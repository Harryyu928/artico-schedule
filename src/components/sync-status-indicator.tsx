'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Check, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncStatus {
  lastSyncTime: string | null;
  isSyncing: boolean;
  lastResult: any;
  nextSyncTime: string | null;
  syncIntervalMinutes: number;
}

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // 获取同步状态
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/feishu/sync');
      const data = await res.json();
      setStatus(data.status);
    } catch (error) {
      console.error('获取同步状态失败:', error);
    }
  };

  // 手动同步
  const handleSync = async () => {
    if (loading || status?.isSyncing) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/feishu/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' }),
      });
      const data = await res.json();
      setStatus(data.status);
    } catch (error) {
      console.error('同步失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    fetchStatus();
    // 每5分钟刷新状态
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const formatTime = (time: string | null) => {
    if (!time) return '从未';
    return new Date(time).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLastSyncSummary = () => {
    if (!status.lastResult) return null;
    const r = status.lastResult;
    const parts = [];
    if (r.teachers) parts.push(`导师${r.teachers.synced}`);
    if (r.students) parts.push(`学生${r.students.synced}`);
    if (r.classRecords) parts.push(`记录${r.classRecords.synced}`);
    return parts.join(' / ');
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-sm">
      {/* 状态图标 */}
      {status.isSyncing || loading ? (
        <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
      ) : status.lastSyncTime ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-yellow-500" />
      )}

      {/* 状态文字 */}
      <span className="text-gray-600">
        {status.isSyncing || loading ? '同步中...' : `上次同步: ${formatTime(status.lastSyncTime)}`}
      </span>

      {/* 同步结果 */}
      {status.lastResult && (
        <span className="text-gray-400 text-xs">
          ({getLastSyncSummary()})
        </span>
      )}

      {/* 下次同步时间 */}
      {!status.isSyncing && !loading && status.nextSyncTime && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-gray-400 text-xs cursor-help">
                <Clock className="w-3 h-3" />
                <span>下次: {formatTime(status.nextSyncTime)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>每小时自动同步一次</p>
              <p className="text-xs text-gray-400">数据以飞书多维表格为准</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* 手动同步按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={handleSync}
        disabled={status.isSyncing || loading}
      >
        <RefreshCw className={`w-3 h-3 mr-1 ${(status.isSyncing || loading) ? 'animate-spin' : ''}`} />
        立即同步
      </Button>
    </div>
  );
}
