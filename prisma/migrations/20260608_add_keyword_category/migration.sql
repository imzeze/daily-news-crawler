CREATE TABLE "KeywordCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KeywordCategory_name_key" ON "KeywordCategory"("name");

INSERT INTO "KeywordCategory" ("id", "name", "order", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'SAMG', 0, NOW(), NOW()),
  (gen_random_uuid()::text, '콘텐츠 산업', 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'IP경쟁사', 2, NOW(), NOW()),
  (gen_random_uuid()::text, '유통채널경쟁사', 3, NOW(), NOW()),
  (gen_random_uuid()::text, '구글 영문 검색', 4, NOW(), NOW());
