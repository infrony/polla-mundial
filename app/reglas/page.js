import Link from 'next/link';
import BackButton from './BackButton';

export const metadata = {
  title: 'Reglas y Condiciones — Polla Mundial 2026',
};

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '1.25rem', letterSpacing: '3px',
        color: '#F5A623', marginBottom: 14,
        borderBottom: '1px solid rgba(245,166,35,0.25)',
        paddingBottom: 8,
      }}>{title}</h2>
      {children}
    </section>
  );
}

function Sub({ children }) {
  return (
    <h3 style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '0.9rem', letterSpacing: '2px', textTransform: 'uppercase',
      color: '#5b9cf6', marginBottom: 10, marginTop: 18,
    }}>{children}</h3>
  );
}

function P({ children }) {
  return <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 10 }}>{children}</p>;
}

function Ul({ items }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
          <span style={{ color: '#F5A623', flexShrink: 0, marginTop: 2 }}>›</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                padding: '8px 14px', textAlign: 'left',
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '1px', textTransform: 'uppercase',
                color: '#F5A623', background: 'rgba(245,166,35,0.08)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '8px 14px', color: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Highlight({ children }) {
  return (
    <div style={{
      background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)',
      borderRadius: 10, padding: '14px 18px', marginBottom: 16,
      fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7,
    }}>{children}</div>
  );
}

export default function ReglasPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark, #0A0A14)' }}>
      {/* Header */}
      <div style={{ background: '#0d0d1a', borderBottom: '2px solid #C8102E', padding: '14px 20px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/logo.png" alt="FIFA World Cup 2026" style={{ width: 38, height: 38 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '2px', color: '#fff', lineHeight: 1 }}>Polla Mundial 2026</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.65rem', letterSpacing: '2px', color: '#F5A623', textTransform: 'uppercase' }}>EEUU · México · Canadá</div>
          </div>
          <BackButton />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '36px 20px 60px' }}>

        {/* Page title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '2.4rem', letterSpacing: '5px',
            color: '#fff', margin: '0 0 8px',
          }}>📋 Reglas y Condiciones</h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
            Polla Mundialista 2026 · mundial.infrony.app
          </p>
        </div>

        {/* ── ¿Qué es? ─────────────────────────────────────────────── */}
        <Section title="¿Qué es la Polla Mundialista?">
          <P>La Polla Mundialista es un juego de pronósticos del Mundial de Fútbol 2026 (EEUU · México · Canadá). Los participantes predicen resultados de partidos y clasificaciones; quien más aciertos acumule al final gana el premio.</P>
          <Highlight>
            Hay <strong style={{ color: '#F5A623' }}>dos fases independientes</strong> en las que puedes participar:
            <span style={{ display: 'block', marginTop: 8 }}>
              🏟️ <strong>Fase de Grupos</strong> — Inscripción: <strong style={{ color: '#2ecc71' }}>$5</strong> por participante
            </span>
            <span style={{ display: 'block', marginTop: 4 }}>
              🏆 <strong>Fase Eliminatoria</strong> — Inscripción: <strong style={{ color: '#2ecc71' }}>$10</strong> por participante
            </span>
          </Highlight>
        </Section>

        {/* ── Fase de Grupos ───────────────────────────────────────── */}
        <Section title="Fase de Grupos — $5">
          <Sub>¿Qué pronosticar?</Sub>
          <Ul items={[
            'Resultado de cada partido (72 partidos): 1 = gana local · X = empate · 2 = gana visitante.',
            'Clasificados por grupo (12 grupos, A–L): selecciona el 1° y 2° clasificado de cada grupo.',
          ]} />

          <Sub>Puntuación</Sub>
          <Table
            headers={['Acierto', 'Puntos']}
            rows={[
              ['Resultado correcto de partido', '1 punto'],
              ['1° clasificado de grupo correcto', '2 puntos'],
              ['2° clasificado de grupo correcto', '1 punto'],
              ['Puntaje máximo posible', '108 puntos'],
            ]}
          />

          <Sub>Reglas</Sub>
          <Ul items={[
            'Los picks se guardan automáticamente al hacer clic — no hay botón de "Guardar".',
            'Puedes cambiar tu pronóstico en cualquier momento antes de la fecha límite del grupo.',
            'Los picks de cada grupo se bloquean automáticamente cuando inicia su primer partido.',
            'Una vez bloqueados, los picks no pueden modificarse bajo ninguna circunstancia.',
          ]} />

          <Sub>Fechas límite de cierre por grupo</Sub>
          <Table
            headers={['Grupos', 'Cierre de picks (UTC)']}
            rows={[
              ['A y B', '11 Jun — 12:00 / 18:00 UTC'],
              ['C y D', '12 Jun — 12:00 / 18:00 UTC'],
              ['E y F', '13 Jun — 12:00 / 18:00 UTC'],
              ['G y H', '14 Jun — 12:00 / 18:00 UTC'],
              ['I y J', '15 Jun — 12:00 / 18:00 UTC'],
              ['K y L', '16 Jun — 12:00 / 18:00 UTC'],
            ]}
          />
        </Section>

        {/* ── Fase Eliminatoria ────────────────────────────────────── */}
        <Section title="Fase Eliminatoria — $10">
          <Sub>¿Qué pronosticar?</Sub>
          <P>Para cada partido de la fase eliminatoria, selecciona el equipo que crees que ganará (tiempo regular, prórroga o penales).</P>

          <Sub>Puntuación</Sub>
          <Table
            headers={['Ronda', 'Partidos', 'Pts por acierto', 'Máx posible']}
            rows={[
              ['Dieciseisavos de Final', '16', '1 pt', '16 pts'],
              ['Octavos de Final', '8', '2 pts', '16 pts'],
              ['Cuartos de Final', '4', '4 pts', '16 pts'],
              ['Semifinal', '2', '6 pts', '12 pts'],
              ['Tercer Lugar', '1', '8 pts', '8 pts'],
              ['Gran Final', '1', '8 pts', '8 pts'],
              ['Total', '32', '—', '76 pts'],
            ]}
          />

          <Sub>Calendario de apertura de picks</Sub>
          <Table
            headers={['Ronda', 'Picks disponibles desde', 'Primer partido']}
            rows={[
              ['Dieciseisavos', '27 Jun 2026', '28 Jun 2:00 PM'],
              ['Octavos', '3 Jul 2026', '4 Jul 12:00 PM'],
              ['Cuartos', '8 Jul 2026', '9 Jul 3:00 PM'],
              ['Semifinal', '13 Jul 2026', '14 Jul 2:00 PM'],
              ['3er Lugar / Final', '17 Jul 2026', '18 Jul 4:00 PM'],
            ]}
          />

          <Sub>Reglas</Sub>
          <Ul items={[
            'Solo pueden hacer picks los participantes con inscripción de $10 confirmada.',
            'Los picks se bloquean cuando el administrador cierra el partido o ingresa el resultado.',
            'Si un partido va a penales o prórroga, el ganador final es el que cuenta.',
            'Puedes explorar la sección Eliminatorias sin estar inscrito, pero no podrás guardar picks.',
          ]} />
        </Section>

        {/* ── Premios ──────────────────────────────────────────────── */}
        <Section title="Premios">
          <Highlight>
            <strong style={{ color: '#F5A623' }}>El 80% de cada pozo se entrega como premio.</strong>
            {' '}El 20% restante cubre costos administrativos de la plataforma.
          </Highlight>

          <Sub>Fase de Grupos</Sub>
          <Ul items={[
            'Pozo total = $5 × número de participantes inscritos.',
            'Premio = 80% del pozo. Ejemplo: 10 jugadores → pozo $50 → premio $40.',
            'El ganador es el participante con mayor puntaje al cierre de la fase de grupos.',
          ]} />

          <Sub>Fase Eliminatoria</Sub>
          <Ul items={[
            'Pozo total = $10 × número de participantes inscritos.',
            'Premio = 80% del pozo. Ejemplo: 10 jugadores → pozo $100 → premio $80.',
            'El ganador es el participante con mayor puntaje al final de la fase eliminatoria.',
          ]} />

          <Sub>Criterio de desempate</Sub>
          <Ul items={[
            'Desempate 1: mayor número de aciertos en rondas de mayor valor (Final > Semis > Cuartos > R16 > R32).',
            'Desempate 2: si persiste el empate, el 80% del pozo se divide en partes iguales entre los empatados.',
          ]} />
        </Section>

        {/* ── Cómo participar ──────────────────────────────────────── */}
        <Section title="Cómo Participar">
          {[
            { n: '1', t: 'Regístrate', d: 'Ingresa a mundial.infrony.app y crea tu cuenta con correo/contraseña o con Google.' },
            { n: '2', t: 'Confirma tu pago', d: 'Contacta al administrador (infrony@gmail.com) para confirmar tu inscripción. $5 para Grupos, $10 para Eliminatorias. Puedes participar en una o ambas fases.' },
            { n: '3', t: 'Ingresa tus pronósticos', d: 'Ve a "Partidos" para picks de grupos y a "Grupos" para clasificados. Para la fase eliminatoria ve a "Eliminatorias" desde el 27 de junio.' },
            { n: '4', t: 'Sigue tu posición', d: 'En "Tabla" puedes ver el ranking en tiempo real. En "Mis Picks" revisas todos tus pronósticos.' },
          ].map(({ n, t, d }) => (
            <div key={n} style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#F5A623',
              }}>{n}</div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 3 }}>{t}</div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{d}</div>
              </div>
            </div>
          ))}
        </Section>

        {/* ── Reglas generales ─────────────────────────────────────── */}
        <Section title="Reglas Generales">
          <Ul items={[
            'El administrador ingresa los resultados oficiales; la tabla se actualiza automáticamente.',
            'Solo se toma en cuenta el marcador al pitazo final (90 min en grupos; resultado final incluyendo prórroga y penales en eliminatorias).',
            'No se aceptan inscripciones después de que inicie el primer partido del torneo (11 Jun 2026).',
            'La plataforma está disponible las 24 horas durante el torneo.',
            'La decisión del administrador es definitiva en casos no contemplados en estas reglas.',
            'Los participantes son responsables de realizar sus picks dentro de los plazos establecidos.',
          ]} />
        </Section>

        {/* ── Contacto ─────────────────────────────────────────────── */}
        <Section title="Contacto y Soporte">
          <Ul items={[
            'Plataforma: mundial.infrony.app',
            'Administrador: infrony@gmail.com',
            'Desarrollado con ❤️ en Panamá 🇵🇦 por infrony.com',
          ]} />
        </Section>

        {/* Footer note */}
        <div style={{
          textAlign: 'center', marginTop: 40, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.25)', letterSpacing: '1px',
        }}>
          Polla Mundial 2026 · Versión 1.0 · Hecho en Panamá por{' '}
          <a href="https://infrony.com" target="_blank" rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
            infrony.com
          </a>
        </div>
      </div>
    </div>
  );
}
