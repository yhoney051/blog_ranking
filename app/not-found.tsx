// 404 페이지 — 존재하지 않는 경로 접근 시 표시
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link href="/">
          <Button className="mt-4">홈으로 돌아가기</Button>
        </Link>
      </div>
    </div>
  )
}
