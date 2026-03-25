/**
 * 课酬统计页面
 * 路径: /salary
 */

import { Metadata } from 'next';
import { SalaryPage } from './salary-page';

export const metadata: Metadata = {
  title: '课酬统计 - ARTiCO',
  description: '导师课酬统计与报表',
};

export default function Page() {
  return <SalaryPage />;
}
