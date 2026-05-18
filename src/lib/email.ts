// Email provider abstraction. Real delivery plugs in via Resend or
// Amazon SES; until a key is configured `stub` mode logs the message
// and returns success so the weekly-digest cron is exercisable.

type SendArgs = { to: string; subject: string; html: string };

export function emailProvider(): 'resend' | 'ses' | 'stub' {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.AWS_SES_REGION && process.env.AWS_ACCESS_KEY_ID) return 'ses';
  return 'stub';
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  const provider = emailProvider();
  const from = process.env.EMAIL_FROM ?? 'Le.Qat <no-reply@leqat.qa>';

  if (provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  }

  if (provider === 'ses') {
    // SES wiring goes here (AWS SDK v3 SESv2 SendEmail). Left as a
    // documented stub to avoid pulling the AWS SDK before it's needed.
    console.warn('[email] SES selected but sender not yet wired:', subject);
    return false;
  }

  // stub
  console.info(`[email:stub] → ${to} · ${subject}`);
  return true;
}
