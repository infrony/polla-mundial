'use client';
import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/login');
    }
  }

  return (
    <button
      onClick={handleBack}
      style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', letterSpacing: '2px',
        color: 'rgba(255,255,255,0.5)', textDecoration: 'none', textTransform: 'uppercase',
        border: '1px solid rgba(255,255,255,0.15)', padding: '5px 14px', borderRadius: 20,
        background: 'transparent', cursor: 'pointer',
      }}
    >
      ← Volver
    </button>
  );
}
