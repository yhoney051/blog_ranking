'use client'

// Channel.io 채팅 위젯 — 고객 지원용
// Channel.io 플러그인 키를 NEXT_PUBLIC_CHANNEL_IO_KEY 환경변수에 설정하면 활성화됩니다.

import { useEffect } from 'react'

export function ChannelTalk() {
  useEffect(() => {
    const pluginKey = process.env.NEXT_PUBLIC_CHANNEL_IO_KEY
    if (!pluginKey) return

    // Channel.io 부트스트랩 스크립트
    const w = window as typeof window & { ChannelIO?: (...args: unknown[]) => void; ChannelIOInitialized?: boolean }
    if (w.ChannelIOInitialized) return

    const ch = function (...args: unknown[]) {
      ch.c(args)
    } as typeof w.ChannelIO & { c: (args: unknown[]) => void; q: unknown[][] }

    ch.q = []
    ch.c = function (args) {
      ch.q.push(args)
    }
    w.ChannelIO = ch

    const script = document.createElement('script')
    script.src = 'https://cdn.channel.io/plugin/ch-plugin-web.js'
    script.async = true
    script.onload = () => {
      w.ChannelIO?.('boot', { pluginKey })
      w.ChannelIOInitialized = true
    }
    document.head.appendChild(script)

    return () => {
      w.ChannelIO?.('shutdown')
    }
  }, [])

  return null
}
