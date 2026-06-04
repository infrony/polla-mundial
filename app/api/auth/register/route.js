import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return NextResponse.json({ error: 'Este correo ya está registrado.' }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const isAdmin = email.toLowerCase() === adminEmail;

    await query(
      'INSERT INTO users (name, email, password_hash, provider, is_admin) VALUES ($1, $2, $3, $4, $5)',
      [name.trim(), email.toLowerCase(), hash, 'credentials', isAdmin]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
