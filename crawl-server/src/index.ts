// 네이버 블로그 순위 크롤링 마이크로서비스 엔트리포인트
// Express 서버로 /crawl 엔드포인트 제공

import express from 'express'
import { crawlNaverBlogRank } from './crawl'

const app = express()
app.use(express.json())

const API_KEY = process.env.API_KEY

// API 키 인증 미들웨어
app.use((req, res, next) => {
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  next()
})

// 헬스체크
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// 브라우저 테스트 페이지
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>블로그 순위 체커 테스트</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
    h1 { font-size: 20px; }
    input { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #03C75A; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
    button:disabled { background: #ccc; }
    #result { margin-top: 20px; padding: 16px; border-radius: 8px; display: none; font-size: 18px; text-align: center; }
    .found { background: #e8f5e9; color: #2e7d32; }
    .notfound { background: #fff3e0; color: #e65100; }
    .error { background: #ffebee; color: #c62828; }
    #loading { display: none; text-align: center; margin-top: 20px; color: #666; }
  </style>
</head>
<body>
  <h1>네이버 블로그 탭 순위 체커</h1>
  <input id="keyword" placeholder="키워드 입력 (예: 전주지방분해주사)" />
  <input id="blogUrl" placeholder="블로그 주소 (예: blog.naver.com/kjh760322/224072399313)" />
  <button id="btn" onclick="checkRank()">순위 조회</button>
  <div id="loading">크롤링 중... (최대 30초 소요)</div>
  <div id="result"></div>
  <script>
    async function checkRank() {
      const keyword = document.getElementById('keyword').value.trim();
      const blogUrl = document.getElementById('blogUrl').value.trim();
      if (!keyword || !blogUrl) { alert('키워드와 블로그 주소를 모두 입력하세요'); return; }
      document.getElementById('btn').disabled = true;
      document.getElementById('loading').style.display = 'block';
      document.getElementById('result').style.display = 'none';
      try {
        const res = await fetch('/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword, blogUrl })
        });
        const data = await res.json();
        const el = document.getElementById('result');
        if (data.rank) {
          el.className = 'found';
          el.textContent = '블로그 탭 ' + data.rank + '위';
        } else {
          el.className = 'notfound';
          el.textContent = '100위 내에 없습니다';
        }
        el.style.display = 'block';
      } catch (e) {
        const el = document.getElementById('result');
        el.className = 'error';
        el.textContent = '오류 발생: ' + e.message;
        el.style.display = 'block';
      }
      document.getElementById('btn').disabled = false;
      document.getElementById('loading').style.display = 'none';
    }
  </script>
</body>
</html>`)
})

// 순위 크롤링 엔드포인트
app.post('/crawl', async (req, res) => {
  const { keyword, blogUrl } = req.body

  if (!keyword || !blogUrl) {
    res.status(400).json({ error: 'keyword와 blogUrl은 필수입니다' })
    return
  }

  console.log(`[크롤링 요청] 키워드: "${keyword}", 블로그: "${blogUrl}"`)

  try {
    const result = await crawlNaverBlogRank(keyword, blogUrl)
    console.log(`[크롤링 완료] 순위: ${result.rank ?? '미발견'} (총 ${result.totalResults}개 결과)`)
    res.json({ rank: result.rank })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[크롤링 오류] ${message}`)
    res.status(500).json({ error: message })
  }
})

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, () => {
  console.log(`크롤링 서버 실행 중: http://localhost:${PORT}`)
  console.log(`프록시: ${process.env.PROXY_SERVER ?? '미설정 (직접 연결)'}`)
})
