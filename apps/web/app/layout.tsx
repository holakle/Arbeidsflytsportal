import type { ReactNode } from 'react';
import { TopNav } from '@/components/dev/top-nav';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
      <body>
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <TopNav />
        </header>
        {children}
      </body>
    </html>
  );
}
