import { NextResponse } from 'next/server';
import {
  buildKnockoutPayloads, sendToRecipients, knockoutSubject,
  sentLogKeys, markEmailSent, KNOCKOUT_ROUNDS,
} from '@/lib/email-send';

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
  const firstEnd = new Date(KNOCKOUT_ROUNDS[0].endsAt);
  const lastEnd = new Date(KNOCKOUT_ROUNDS[KNOCKOUT_ROUNDS.length - 1].endsAt);
  // Outside the knockout window there is nothing to do (1-day grace after the final).
  if (now < firstEnd || now > new Date(lastEnd.getTime() + 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ skipped: 'fuera de la ventana de eliminatorias' });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Falta RESEND_API_KEY' }, { status: 500 });
  }

  try {
    const alreadySent = await sentLogKeys('knockout');
    // Rounds whose phase has finished and haven't been emailed yet.
    const due = KNOCKOUT_ROUNDS.filter(r => now >= new Date(r.endsAt) && !alreadySent.includes(r.key));

    const sentRounds = [];
    const failures = [];
    for (const round of due) {
      const payloads = await buildKnockoutPayloads(round.key);
      const recipients = payloads.filter(p => p.email && p.paid_knockout);
      if (recipients.length === 0) {
        // No participants yet — log it so we don't retry forever for this round.
        await markEmailSent('knockout', round.key, 0);
        sentRounds.push({ round: round.key, sent: 0 });
        continue;
      }
      const { sent, failures: f } = await sendToRecipients(recipients, knockoutSubject(round.label));
      if (f.length) { failures.push(`${round.key}: ${f.join('; ')}`); continue; }
      await markEmailSent('knockout', round.key, sent);
      sentRounds.push({ round: round.key, sent });
    }

    if (failures.length) return NextResponse.json({ ok: false, sentRounds, failures }, { status: 502 });
    return NextResponse.json({ ok: true, sentRounds });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
