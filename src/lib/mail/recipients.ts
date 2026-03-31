import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type MailRecipient = {
  id: string;
  email: string;
  createdAt: string;
};

type RecipientFile = {
  recipients: MailRecipient[];
  updatedAt: string | null;
};

const RECIPIENTS_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "scrap-mail-recipients.json",
);

const INITIAL_RECIPIENT_FILE: RecipientFile = {
  recipients: [],
  updatedAt: null,
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function ensureRecipientFile() {
  await mkdir(path.dirname(RECIPIENTS_FILE_PATH), { recursive: true });

  try {
    await readFile(RECIPIENTS_FILE_PATH, "utf-8");
  } catch {
    await writeFile(
      RECIPIENTS_FILE_PATH,
      JSON.stringify(INITIAL_RECIPIENT_FILE, null, 2),
      "utf-8",
    );
  }
}

async function readRecipientFile(): Promise<RecipientFile> {
  await ensureRecipientFile();

  try {
    const content = await readFile(RECIPIENTS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(content) as Partial<RecipientFile>;
    const recipients = Array.isArray(parsed.recipients) ? parsed.recipients : [];

    return {
      recipients: recipients.filter(
        (recipient): recipient is MailRecipient =>
          Boolean(recipient) &&
          typeof recipient.id === "string" &&
          typeof recipient.email === "string" &&
          typeof recipient.createdAt === "string",
      ),
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return INITIAL_RECIPIENT_FILE;
  }
}

async function writeRecipientFile(recipients: MailRecipient[]) {
  const payload: RecipientFile = {
    recipients,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(
    RECIPIENTS_FILE_PATH,
    JSON.stringify(payload, null, 2),
    "utf-8",
  );
}

export async function listMailRecipients() {
  const current = await readRecipientFile();
  return current.recipients;
}

export async function addMailRecipient(email: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!isValidEmail(trimmedEmail)) {
    throw new Error("유효한 이메일 주소를 입력해 주세요.");
  }

  const current = await readRecipientFile();
  const exists = current.recipients.some(
    (recipient) => recipient.email === trimmedEmail,
  );

  if (exists) {
    throw new Error("이미 등록된 이메일 주소입니다.");
  }

  const nextRecipient: MailRecipient = {
    id: crypto.randomUUID(),
    email: trimmedEmail,
    createdAt: new Date().toISOString(),
  };

  const nextRecipients = [...current.recipients, nextRecipient];
  await writeRecipientFile(nextRecipients);
  return nextRecipient;
}

export async function removeMailRecipient(id: string) {
  const current = await readRecipientFile();
  const nextRecipients = current.recipients.filter(
    (recipient) => recipient.id !== id,
  );

  if (nextRecipients.length === current.recipients.length) {
    return false;
  }

  await writeRecipientFile(nextRecipients);
  return true;
}
