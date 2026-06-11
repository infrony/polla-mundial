import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { runSync, ensureColumns } from '@/lib/sync';

// GET: last 10 sync logs
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    await ensureColumns();
    const logs = await query(`SELECT * FROM api_sync_log ORDER BY synced_at DESC LIMIT 10`);
    return NextResponse.json({ logs: logs.rows });
  } catch (err) {
    return NextResponse.json({ logs: [], error: err.message });
  }
}

// POST: manual sync triggered from admin panel
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { mode = 'today' } = await req.json();

  try {
    const result = await runSync(mode);
    return NextResponse.json({
      ...result,
      requestsRemaining: result.requestsLimit != null
        ? result.requestsLimit - (result.requestsUsed ?? 0)
        : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
