/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  experimental: {
    // No reutilizar el Router Cache en memoria al navegar con <Link>:
    // las páginas dinámicas (admin, etc.) siempre vuelven a leer datos frescos
    // del servidor en vez de mostrar el payload RSC cacheado de antes.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  async headers() {
    return [
      {
        // Páginas HTML: nunca cachear — el browser siempre pide la versión más reciente
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        // JS/CSS/fuentes estáticas: cachear para siempre — Next.js les pone hash en el nombre
        // cuando hay nueva versión el nombre cambia y el browser descarga el archivo nuevo
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
