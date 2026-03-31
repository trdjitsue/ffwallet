import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/shared/BottomNav'

export default function StudentTournament() {
  const navigate = useNavigate()

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/student')} style={styles.backBtn}>← กลับ</button>
        <div style={styles.headerTitle}>FF Tournament</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.trophy}>🏆</div>
        <div style={styles.title}>FF Tournament</div>
        <div style={styles.badge}>Coming Soon</div>
        <p style={styles.desc}>
          ฟีเจอร์นี้กำลังจะมาเร็วๆ นี้<br />
          รอติดตามได้เลย!
        </p>
      </div>

      <div style={{ height: 80 }} />
      <BottomNav role="student" />
    </div>
  )
}

const styles = {
  page: { minHeight: '100dvh', background: 'linear-gradient(160deg, #1A0760 0%, #4519C9 50%, #6C3AF7 100%)' },
  header: {
    padding: '52px 16px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
  },
  headerTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'white',
  },
  content: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 20px', gap: 16,
    minHeight: 'calc(100dvh - 160px)',
  },
  trophy: {
    fontSize: '6rem',
    animation: 'float 3s ease infinite',
    filter: 'drop-shadow(0 0 32px rgba(245,200,66,0.6))',
  },
  title: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '2rem', color: 'white', letterSpacing: '-0.02em',
  },
  badge: {
    background: '#F5C842', color: '#1A0760',
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '0.85rem', borderRadius: 20, padding: '6px 20px',
    letterSpacing: '0.1em', textTransform: 'uppercase',
  },
  desc: {
    fontFamily: 'Noto Sans Thai, sans-serif',
    fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', lineHeight: 1.8, marginTop: 8,
  },
}