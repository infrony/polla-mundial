import { NextResponse } from 'next/server';
import { runSync } from '@/lib/sync';
import { TOURNAMENT_START } from '@/lib/data';

// Tournament ends after the final (Jul 19 2026)
const TOURNAMENT_END = '2026-07-20T00:00:00Z';

export async function GET(req) {
  // Vercel sends Authorization: Bearer <CRON_SECRET> automatically
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  if (now < new Date(TOURNAMENT_START) || now > new Date(TOURNAMENT_END)) {
    return NextResponse.json({ skipped: 'outside tournament window' });
  }

  try {
    const result = await runSync('today');
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
