import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ChannelTalk } from "@/components/channel-talk";

export const metadata: Metadata = {
  title: {
    default: '수니 — 네이버 블로그 키워드 순위 추적',
    template: '%s | 수니',
  },
  description: '네이버 블로그 키워드 순위를 자동으로 추적하세요. 실시간 순위 조회, 변동 알림, 일일 자동 체크까지.',
  keywords: ['네이버 블로그', '블로그 순위', '키워드 순위', 'SEO', '블로그 최적화', '네이버 검색 순위'],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '수니',
    title: '수니 — 네이버 블로그 키워드 순위 추적',
    description: '키워드를 등록하면 네이버 블로그 탭의 실제 순위를 매일 자동 추적합니다.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '수니',
    description: '네이버 블로그 키워드 순위를 자동으로 추적하세요.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="font-sans" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster richColors position="bottom-right" />
        <Analytics />
        <SpeedInsights />
        <ChannelTalk />
      </body>
    </html>
  );
}
