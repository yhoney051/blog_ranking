// POST /api/format — 블로그 원고 포맷 분석 API (인증 불필요, MVP)
// Gemini 무료 티어 사용 (Flash 모델)
import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { formatRequestSchema } from '@/lib/validations'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/formatter/prompt'
import type { FormatResponse } from '@/types/formatter'

// 불완전한 JSON에서 마지막 완전한 블록까지만 추출
function repairJson(raw: string): string {
  const text = raw.replace(/```json\n?|\n?```/g, '').trim()

  try {
    JSON.parse(text)
    return text
  } catch {
    // 파싱 실패 시 복구 시도
  }

  // 마지막 완전한 } 찾기 (블록 단위로 역추적)
  let lastValid = -1
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '}') {
      // 이 위치까지 잘라서 ]} 붙여보기
      const attempt = text.substring(0, i + 1) + ']}'
      try {
        JSON.parse(attempt)
        return attempt
      } catch {
        // 더 앞으로 역추적
        if (lastValid === -1) lastValid = i
      }
    }
  }

  // 그래도 실패하면 원본 반환 (에러는 catch에서 처리)
  return text
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = formatRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const { text } = parsed.data

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildUserPrompt(text),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
      },
    })

    const responseText = response.text
    if (!responseText) {
      return NextResponse.json({ error: 'AI 응답이 비어있습니다.' }, { status: 500 })
    }

    const jsonText = repairJson(responseText)
    const result: FormatResponse = JSON.parse(jsonText)

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/format]', message)
    return NextResponse.json({ error: `포맷 분석에 실패했습니다: ${message}` }, { status: 500 })
  }
}
