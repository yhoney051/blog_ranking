// 개인정보 처리방침 페이지
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '개인정보 처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="text-lg font-bold">블로그 순위 체커</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">개인정보 처리방침</h1>
        <p className="text-sm text-muted-foreground mb-8">시행일: 2026년 4월 4일</p>

        <div className="prose prose-sm prose-neutral max-w-none space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. 수집하는 개인정보 항목</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              블로그 순위 체커(이하 &quot;서비스&quot;)는 회원가입 및 서비스 이용 과정에서 아래의 개인정보를 수집합니다.
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>필수 수집 항목:</strong> 이메일 주소, 비밀번호(암호화 저장)</li>
              <li><strong>서비스 이용 시:</strong> 네이버 블로그 URL, 검색 키워드</li>
              <li><strong>자동 수집 항목:</strong> 접속 IP, 접속 일시, 서비스 이용 기록</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>회원 가입 및 본인 식별</li>
              <li>네이버 블로그 키워드 순위 조회 서비스 제공</li>
              <li>서비스 개선 및 통계 분석</li>
              <li>고객 문의 응대 및 공지사항 전달</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>전자상거래법에 의한 계약·결제 기록: 5년</li>
              <li>통신비밀보호법에 의한 접속 로그: 3개월</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. 개인정보의 제3자 제공</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 서비스 운영을 위해 아래의 외부 서비스를 이용합니다.
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>Supabase:</strong> 회원 인증 및 데이터 저장 (미국, AWS 인프라)</li>
              <li><strong>Bright Data:</strong> 검색 결과 조회 (이스라엘)</li>
              <li><strong>Vercel:</strong> 서비스 호스팅 (미국)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. 개인정보의 파기 절차 및 방법</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              회원 탈퇴 요청 시 개인정보는 즉시 파기됩니다. 전자적 파일 형태의 정보는 복구할 수 없는 방법으로 삭제합니다.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. 이용자의 권리</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제, 처리 정지를 요구할 수 있습니다.
              설정 페이지에서 직접 수정하거나 고객 지원을 통해 요청할 수 있습니다.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. 개인정보 보호 책임자</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              개인정보 처리에 관한 문의는 아래 연락처로 문의해주세요.
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>이메일: support@blogrank.kr</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. 개인정보 처리방침 변경</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              본 방침은 관련 법령 및 서비스 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 text-center text-sm text-muted-foreground border-t">
        &copy; 2026 블로그 순위 체커. All rights reserved.
      </footer>
    </div>
  )
}
