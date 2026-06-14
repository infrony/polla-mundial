import { NextResponse } from 'next/server';
import { TOURNAMENT_START } from '@/lib/data';
import { buildWeeklyPayloads, sendToRecipients, EMAIL_SUBJECT } from '@/lib/email-send';

// Stop sending after the group stage ends (last group matches are on Jul 1, 2026).
const GROUP_STAGE_END = '2026-07-02T00:00:00Z';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // Vercel sends Authorization: Bearer <CRON_SECRET> automatically.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  if (now < new Date(TOURNAMENT_START) || now > new Date(GROUP_STAGE_END)) {
    return NextResponse.json({ skipped: 'fuera de la fase de grupos' });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Falta RESEND_API_KEY' }, { status: 500 });
  }

  try {
    const payloads = await buildWeeklyPayloads();
    const recipients = payloads.filter(p => p.email && p.paid);
    if (recipients.length === 0) return NextResponse.json({ ok: true, sent: 0, note: 'sin destinatarios pagados' });
    const { sent, failures } = await sendToRecipients(recipients, EMAIL_SUBJECT);
    if (failures.length) return NextResponse.json({ ok: false, sent, failures }, { status: 502 });
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
