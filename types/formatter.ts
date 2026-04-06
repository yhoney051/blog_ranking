// 블로그 원고 포맷터 타입 정의

// 인라인 서식 — 텍스트 내 부분 적용 (볼드, 색상 등)
export type InlineSegment = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string        // 글자색 (예: "#e74c3c")
  highlight?: string    // 배경색/형광펜 (예: "#fff9c4")
}

// 네이버 블로그 인용구 6종
export type QuoteVariant =
  | 'quotemark'      // 따옴표
  | 'vertical-line'  // 버티컬 라인
  | 'speech-bubble'  // 말풍선
  | 'line-quote'     // 라인&따옴표
  | 'postit'         // 포스트잇

// 네이버 블로그 구분선 7종
export type DividerVariant =
  | 'solid'      // 실선
  | 'bold'       // 굵은선
  | 'dotted'     // 점선
  | 'diamond'    // 다이아몬드
  | 'star'       // 별
  | 'heart'      // 하트
  | 'wave'       // 웨이브

// 텍스트 정렬
export type TextAlign = 'left' | 'center' | 'right'

// 포맷 분석 결과 블록 타입
export type FormattedBlock =
  | { type: 'paragraph'; content: InlineSegment[]; align?: TextAlign }
  | { type: 'heading'; level: 1 | 2 | 3; content: InlineSegment[]; align?: TextAlign }
  | { type: 'quote'; variant: QuoteVariant; content: InlineSegment[]; toolName: string }
  | { type: 'divider'; variant: DividerVariant; toolName: string }
  | { type: 'list'; style: 'ordered' | 'unordered'; items: { content: InlineSegment[] }[] }

// API 응답 타입
export type FormatResponse = {
  blocks: FormattedBlock[]
}
