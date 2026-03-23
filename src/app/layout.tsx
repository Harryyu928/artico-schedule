import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AppLayout from '@/components/app-layout';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ARTDiCO 自动排课系统',
  description: '智能教务管理系统，支持学生选课、导师排课、自动排课及飞书集成',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
