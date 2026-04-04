// 서비스 이용약관 페이지
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '서비스 이용약관',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="text-lg font-bold">블로그 순위 체커</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">서비스 이용약관</h1>
        <p className="text-sm text-muted-foreground mb-8">시행일: 2026년 4월 4일</p>

        <div className="prose prose-sm prose-neutral max-w-none space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제1조 (목적)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              본 약관은 블로그 순위 체커(이하 &quot;서비스&quot;)의 이용 조건 및 절차,
              회사와 이용자 간의 권리와 의무를 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제2조 (서비스의 내용)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">서비스는 다음의 기능을 제공합니다.</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>네이버 블로그 키워드 검색 순위 조회</li>
              <li>순위 변동 이력 추적 및 시각화</li>
              <li>일일 자동 순위 체크</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제3조 (회원가입 및 계정)</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>이메일 주소와 비밀번호로 가입할 수 있습니다.</li>
              <li>허위 정보로 가입한 경우 서비스 이용이 제한될 수 있습니다.</li>
              <li>계정 정보의 관리 책임은 이용자에게 있습니다.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제4조 (이용 요금 및 결제)</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>무료 플랜: 키워드 3개까지 무료로 이용 가능</li>
              <li>유료 플랜: 추가 키워드 등록 및 고급 기능 이용 (별도 안내)</li>
              <li>유료 서비스의 요금 및 결제 방식은 서비스 내에서 별도 고지합니다.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제5조 (환불 정책)</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>결제일로부터 7일 이내: 전액 환불</li>
              <li>7일 경과 후: 잔여 기간에 대한 일할 계산 환불</li>
              <li>환불 요청은 고객 지원을 통해 가능합니다.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제6조 (금지 행위)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">이용자는 다음 행위를 해서는 안 됩니다.</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>서비스를 이용한 자동화 스크래핑 또는 크롤링</li>
              <li>다른 이용자의 계정을 무단으로 사용하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>API를 과도하게 호출하여 서비스에 부하를 주는 행위</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제7조 (면책 조항)</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>네이버 검색 결과의 정확성은 보장하지 않으며, 참고 용도로만 제공됩니다.</li>
              <li>네이버의 정책 변경, 시스템 장애 등 외부 요인으로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
              <li>천재지변, 전쟁 등 불가항력에 의한 서비스 중단 시 책임이 면제됩니다.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제8조 (서비스 변경 및 중단)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              서비스는 사전 고지 후 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
              긴급한 경우 사후 고지할 수 있습니다.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제9조 (분쟁 해결)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              본 약관과 관련한 분쟁은 대한민국 법률에 따라 관할 법원에서 해결합니다.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제10조 (약관의 변경)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              약관 변경 시 시행일 7일 전부터 서비스 내 공지를 통해 안내합니다.
              이용자에게 불리한 변경의 경우 30일 전에 안내합니다.
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
