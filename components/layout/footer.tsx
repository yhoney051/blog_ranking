import Link from 'next/link'

export function Footer() {
  return (
    <footer className="py-6 px-4 border-t border-border bg-card/30">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* 사업자 정보 */}
        <div className="text-xs text-muted-foreground leading-relaxed text-center">
          <p>
            상호: 산행 | 대표: 권상순 | 사업자등록번호: 779-04-03208
          </p>
          <p>
            주소: 경상남도 양산시 물금읍 가촌서로 11, 104동 1801호(양산물금한신더휴)
          </p>
          <p>
            전화: 070-7954-1459 | 이메일: support@blogrank.kr | 업태: 도소매 | 종목: 전자상거래
          </p>
        </div>

        {/* 약관 링크 */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
          <Link href="/contact" className="hover:text-foreground transition-colors">대행 문의</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">이용약관</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</Link>
          <span>·</span>
          <Link href="/refund" className="hover:text-foreground transition-colors">환불정책</Link>
        </div>

        <p className="text-xs text-muted-foreground/60 text-center">
          &copy; 2026 수니. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
