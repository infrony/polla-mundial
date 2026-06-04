import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from './db';

export const authOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    ] : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const res = await query('SELECT * FROM users WHERE email = $1', [credentials.email.toLowerCase()]);
        const user = res.rows[0];
        if (!user || !user.password_hash) return null;
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;
        return { id: String(user.id), name: user.name, email: user.email, image: user.image, isAdmin: user.is_admin };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin ?? false;
      }
      if (account?.provider === 'google' && profile) {
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const email = profile.email?.toLowerCase();
        const res = await query(
          `INSERT INTO users (name, email, image, provider, is_admin)
           VALUES ($1, $2, $3, 'google', $4)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image
           RETURNING *`,
          [profile.name, email, profile.picture, email === adminEmail]
        );
        const dbUser = res.rows[0];
        token.id = String(dbUser.id);
        token.isAdmin = dbUser.is_admin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.isAdmin = token.isAdmin;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
