import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'Polla Mundial 2026',
  description: 'Pronostica los partidos del Mundial 2026 USA · México · Canadá',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
