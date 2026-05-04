'use client'

// 결제 성공 시 confetti 애니메이션 (외부 라이브러리 의존성 없이 자체 구현)
// 60개 입자가 위에서 떨어지며 회전, 2.5초 후 자동 제거

import { useEffect, useState } from 'react'

type Props = {
  show: boolean
  onComplete?: () => void
}

const COLORS = [
  '#E4FD60', // brand-300
  '#FAFFE6', // brand-50
  '#F3FEBD', // brand-100
  '#ECFD94', // brand-200
  '#D4ED4E', // brand-400
  '#fbbf24', // amber-400
  '#3b82f6', // blue-500
  '#ec4899', // pink-500
]

type Particle = {
  id: number
  x: number
  rotate: number
  color: string
  delay: number
  scale: number
  drift: number
}

export function ConfettiBurst({ show, onComplete }: Props) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!show) return

    const newParticles: Particle[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      rotate: Math.random() * 360,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.4,
      scale: 0.6 + Math.random() * 0.8,
      drift: (Math.random() - 0.5) * 200, // 좌우 흔들림 (px)
    }))
    setParticles(newParticles)

    const timer = setTimeout(() => {
      setParticles([])
      onComplete?.()
    }, 3500)

    return () => clearTimeout(timer)
  }, [show, onComplete])

  if (particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            width: '8px',
            height: '12px',
            backgroundColor: p.color,
            borderRadius: '2px',
            transform: `rotate(${p.rotate}deg) scale(${p.scale})`,
            animation: `confetti-fall 3s ${p.delay}s cubic-bezier(0.4, 0.05, 0.6, 0.95) forwards`,
            ['--drift' as string]: `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--drift), 110vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
