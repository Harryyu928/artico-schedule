/**
 * 结课审核页面
 * 路径: /settlements
 * 
 * TODO: 等待用户提供结课模板后调整具体UI
 */

import { Metadata } from 'next';
import { SettlementPage } from './settlement-page';

export const metadata: Metadata = {
  title: '结课审核 - ARTiCO',
  description: '课程结课审核与课酬管理',
};

export default function Page() {
  return <SettlementPage />;
}
