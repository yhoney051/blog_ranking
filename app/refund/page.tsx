// 환불/취소/해지 정책 페이지 — KPN 카드사 심사용 환불약관
import { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: '환불 정책',
}

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="text-lg font-bold">수니</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">환불 정책</h1>
        <p className="text-sm text-muted-foreground mb-8">시행일: 2026년 4월 6일</p>

        <div className="prose prose-sm prose-neutral max-w-none space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제1조 (적용 범위)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              본 환불 정책은 수니(이하 &quot;서비스&quot;)의 유료 구독 서비스에 적용됩니다.
              무료 플랜 이용자에게는 별도의 환불 정책이 적용되지 않습니다.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제2조 (구독 해지)</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>이용자는 언제든지 구독을 해지할 수 있습니다.</li>
              <li>구독 해지 시 다음 결제일부터 자동 갱신이 중단됩니다.</li>
              <li>해지 후에도 현재 결제 기간이 만료될 때까지 유료 서비스를 계속 이용할 수 있습니다.</li>
              <li>구독 해지는 서비스 내 설정 페이지에서 직접 처리하거나, 고객 지원 이메일을 통해 요청할 수 있습니다.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제3조 (환불 규정)</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>결제일로부터 7일 이내:</strong> 전액 환불이 가능합니다.</li>
              <li><strong>결제일로부터 7일 경과 후:</strong> 이용 일수를 제외한 잔여 기간에 대해 일할 계산하여 환불합니다.</li>
              <li>일할 계산 공식: 환불 금액 = 결제 금액 × (잔여 일수 ÷ 총 이용 일수)</li>
              <li>환불 금액은 원 단위 이하 절사합니다.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제4조 (환불 절차)</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>환불 요청은 고객 지원 이메일(support@sooni.ai.kr)로 접수할 수 있습니다.</li>
              <li>환불 요청 시 회원 이메일, 결제일, 환불 사유를 함께 기재해 주세요.</li>
              <li>환불 처리 기간은 요청일로부터 3~5영업일 이내입니다.</li>
              <li>환불은 원래 결제 수단으로 진행됩니다.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제5조 (환불 불가 사유)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">다음의 경우 환불이 제한될 수 있습니다.</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>서비스 이용약관을 위반하여 이용이 정지된 경우</li>
              <li>부정한 방법으로 서비스를 이용한 경우</li>
              <li>이용자의 귀책 사유로 서비스를 이용하지 못한 경우</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제6조 (요금 변경 시 고지)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              서비스 요금이 변경되거나 무료에서 유료로 전환되는 경우,
              변경 적용일 7일 전까지 이용자가 동의한 수단(이메일, 서비스 내 공지)을 통해
              다음 사항을 사전 고지합니다.
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>변경되는 결제 금액</li>
              <li>변경 적용 일정</li>
              <li>환불 등의 거래 조건</li>
              <li>계약 해지 방법</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">제7조 (문의)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              환불 및 구독 관련 문의는 아래 연락처로 문의해 주세요.
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>이메일: support@sooni.ai.kr</li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
