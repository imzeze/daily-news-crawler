type LarkPayload = {
  title: string;
  text: string;
};

function buildLarkText(title: string, text: string) {
  const maxLength = Number(process.env.LARK_MAX_TEXT_LENGTH || 3500);
  const body =
    text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
  return `${title}\n\n${body}`;
}

export async function sendLarkMessage(payload: LarkPayload) {
  const webhookUrl = process.env.LARK_WEBHOOK_URL;

  if (!webhookUrl) {
    return { ok: false, reason: "missing_env" } as const;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      msg_type: "text",
      content: {
        text: buildLarkText(payload.title, payload.text),
      },
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: `http_${response.status}` } as const;
  }

  const result = (await response.json().catch(() => null)) as {
    code?: number;
    msg?: string;
  } | null;

  if (result && typeof result.code === "number" && result.code !== 0) {
    return { ok: false, reason: `lark_${result.code}` } as const;
  }

  return { ok: true } as const;
}
