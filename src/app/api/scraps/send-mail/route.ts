import { listScraps } from "@/lib/scraps/store";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    emails?: string[];
    articles?: Array<{
      title: string;
      url: string;
      keyword: string;
      publishedAt: string;
      source?: string;
    }>;
  };
  const emails = Array.isArray(payload.emails)
    ? payload.emails.map((email) => email.trim().toLowerCase()).filter(Boolean)
    : [];

  if (emails.length === 0 || emails.some((email) => !isValidEmail(email))) {
    return NextResponse.json(
      { message: "전송할 이메일 주소를 선택해 주세요." },
      { status: 400 },
    );
  }

  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 587);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;
  const from = process.env.MAIL_FROM || user;

  if (!host || !user || !pass || !from) {
    return NextResponse.json(
      { message: "SMTP 설정이 완료되지 않았습니다." },
      { status: 500 },
    );
  }

  const articles =
    Array.isArray(payload.articles) && payload.articles.length > 0
      ? payload.articles
      : (await listScraps()).articles;
  if (articles.length === 0) {
    return NextResponse.json(
      { message: "전송할 스크랩 기사가 없습니다." },
      { status: 400 },
    );
  }

  const grouped = articles.reduce<Record<string, typeof articles>>(
    (acc, article) => {
      if (!acc[article.keyword]) {
        acc[article.keyword] = [];
      }
      acc[article.keyword].push(article);
      return acc;
    },
    {},
  );

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#0f172a;">
      <h2 style="margin:0 0 8px 0;">스크랩 기사 모음</h2>
      <p style="margin:0 0 16px 0;color:#475569;">총 <strong>${articles.length}건</strong>의 스크랩 기사를 전송했습니다.</p>
      ${Object.entries(grouped)
        .sort(([left], [right]) => left.localeCompare(right, "ko"))
        .map(
          ([keyword, items]) => `
            <section style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;">
              <h3 style="margin:0 0 10px 0;">${keyword} (${items.length})</h3>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tbody>
                  ${items
                    .map(
                      (article) => `
                        <tr>
                          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                            <a href="${article.url}" target="_blank" style="color:#0f172a;text-decoration:none;">
                              ${article.title}
                            </a>
                            <div style="margin-top:4px;color:#64748b;font-size:12px;">
                              ${article.source ? `${article.source} · ` : ""}${new Intl.DateTimeFormat("ko-KR", {
                                dateStyle: "medium",
                              }).format(new Date(article.publishedAt))}
                            </div>
                          </td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            </section>
          `,
        )
        .join("")}
    </div>
  `;

  const transportOptions: SMTPTransport.Options & { family: 4 } = {
    host,
    port,
    family: 4,
    auth: {
      user,
      pass,
    },
  };

  const transporter = nodemailer.createTransport(transportOptions);

  try {
    await transporter.sendMail({
      from,
      to: emails.join(", "),
      subject: `[스크랩 기사] ${new Date().toLocaleDateString("ko-KR")} (${articles.length}건)`,
      html,
    });

    return NextResponse.json({
      message: `${emails.length}개의 이메일 주소로 스크랩 기사를 전송했습니다.`,
      sentTo: emails,
      articleCount: articles.length,
    });
  } catch (error) {
    console.error("이메일 전송 실패:", error);
    return NextResponse.json(
      { message: "이메일 전송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
