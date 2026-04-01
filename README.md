## 회사 관련 PR 기사를 매일 자동 수집·리포팅하는 Daily News Crawler

현재 프로젝트는 JSON 파일 저장소를 사용하지 않고 Prisma + SQLite 기반으로 데이터를 저장합니다.

### 저장 위치

- DB 파일: `prisma/dev.db`
- Prisma 스키마: `prisma/schema.prisma`
- Prisma 클라이언트 초기화: `src/lib/db.ts`

### 환경 변수

- 루트 `.env`
- `DATABASE_URL="file:./dev.db"`

Prisma에서 `file:./dev.db`는 `prisma/schema.prisma` 기준으로 해석되므로 실제 DB 파일은 `prisma/dev.db`입니다.

### 주요 테이블

- `Keyword`
- `Scrap`
- `MailRecipient`
- `SentimentKeyword`

### 자주 쓰는 명령

```bash
npx prisma generate
npx prisma db push
```
