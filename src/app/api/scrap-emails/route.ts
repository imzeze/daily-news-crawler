import { NextResponse } from "next/server";
import { addMailRecipient, listMailRecipients } from "@/lib/mail/recipients";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const recipients = await listMailRecipients();
  return NextResponse.json({ recipients });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { email?: string };

  if (typeof payload.email !== "string") {
    return NextResponse.json(
      { message: "유효한 이메일 주소를 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    const recipient = await addMailRecipient(payload.email);
    return NextResponse.json({ recipient }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "이메일 주소를 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
