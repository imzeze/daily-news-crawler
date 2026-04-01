import { prisma } from "@/lib/db";

export type MailRecipient = {
  id: string;
  email: string;
  createdAt: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function listMailRecipients() {
  const recipients = await prisma.mailRecipient.findMany({
    orderBy: { createdAt: "asc" },
  });

  return recipients.map((recipient) => ({
    id: recipient.id,
    email: recipient.email,
    createdAt: recipient.createdAt.toISOString(),
  }));
}

export async function addMailRecipient(email: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!isValidEmail(trimmedEmail)) {
    throw new Error("유효한 이메일 주소를 입력해 주세요.");
  }

  const exists = await prisma.mailRecipient.findUnique({
    where: { email: trimmedEmail },
  });

  if (exists) {
    throw new Error("이미 등록된 이메일 주소입니다.");
  }

  const createdRecipient = await prisma.mailRecipient.create({
    data: {
      id: crypto.randomUUID(),
      email: trimmedEmail,
      createdAt: new Date(),
    },
  });

  return {
    id: createdRecipient.id,
    email: createdRecipient.email,
    createdAt: createdRecipient.createdAt.toISOString(),
  };
}

export async function removeMailRecipient(id: string) {
  const deleted = await prisma.mailRecipient.deleteMany({
    where: { id },
  });

  return deleted.count > 0;
}
