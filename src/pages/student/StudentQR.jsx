import { useAuth } from '../../hooks/useAuth'
import { QRCodeSVG } from 'qrcode.react'
import BottomNav from '../../components/shared/BottomNav'

export default function StudentQR() {
  const { profile } = useAuth()
  if (!profile) return null

  const qrData = JSON.stringify({
    type: 'ff_wallet_student',
    id: profile.id,
    username: profile.username,
    nickname: profile.nickname,
    name: `${profile.first_name} ${profile.last_name}`,
  })

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>QR Code ของฉัน</div>
        <div style={styles.headerSub}>ให้ครูสแกนเพื่อให้แต้ม</div>
      </div>

      <div style={styles.content}>
        {/* Avatar */}
        <div style={styles.avatarWrap}>
          <div style={styles.avatar(profile.avatar_color)}>
            {profile.nickname?.[0]?.toUpperCase()}
          </div>
          <div style={styles.name}>{profile.nickname}</div>
          <div style={styles.fullname}>{profile.first_name} {profile.last_name}</div>
          <div style={styles.school}>{profile.school}</div>
          <div style={styles.username}>@{profile.username}</div>
        </div>

        {/* QR Code */}
        <div style={styles.qrCard}>
          <div style={styles.qrInner}>
            <QRCodeSVG
              value={qrData}
              size={220}
              bgColor="transparent"
              fgColor="#1A1A2E"
              level="M"
            />
          </div>
          <div style={styles.qrLabel}>สแกน QR Code นี้</div>
        </div>

        {/* Points badge */}
        <div style={styles.pointsBadge}>
          <span style={styles.pointsNum}>{profile.points}</span>
          <span style={styles.pointsLabel}>แต้มคงเหลือ</span>
        </div>

        <p style={styles.hint}>
          💡 แสดง QR Code นี้ให้ครูสแกนเพื่อรับแต้ม
        </p>
      </div>

      <div style={{ height: 80 }} />
      <BottomNav role="student" />
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'linear-gradient(160deg, #F5F0FF 0%, #EDE5FF 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #6C3AF7 0%, #4519C9 100%)',
    padding: '52px 20px 24px',
    textAlign: 'center',
  },
  headerTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.4rem', color: 'white',
  },
  headerSub: {
    fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: 4,
  },
  content: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '24px 20px', gap: 20,
  },
  avatarWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  avatar: (color) => ({
    width: 72, height: 72, borderRadius: '50%',
    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.8rem', fontWeight: 800, color: 'white',
    fontFamily: 'Sora, sans-serif',
    boxShadow: `0 8px 24px ${color}60`,
    marginBottom: 4,
  }),
  name: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.4rem', color: '#1A1A2E',
  },
  fullname: {
    fontSize: '0.9rem', color: '#4A4A62', fontWeight: 500,
  },
  school: {
    fontSize: '0.8rem', color: '#9898AD',
  },
  username: {
    fontFamily: 'Space Mono, monospace', fontSize: '0.8rem',
    color: '#6C3AF7', fontWeight: 700,
    background: '#F0EBFF', padding: '2px 10px', borderRadius: 20, marginTop: 4,
  },
  qrCard: {
    background: 'white', borderRadius: 24, padding: '24px',
    boxShadow: '0 8px 32px rgba(108,58,247,0.15)',
    border: '2px solid rgba(108,58,247,0.1)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    animation: 'scaleIn 0.4s ease',
  },
  qrInner: {
    padding: 4,
    background: 'white', borderRadius: 12,
  },
  qrLabel: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.9rem', color: '#6C3AF7',
    letterSpacing: '0.02em',
  },
  pointsBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: 'linear-gradient(135deg, #6C3AF7, #4519C9)',
    borderRadius: 20, padding: '12px 32px',
    boxShadow: '0 8px 24px rgba(108,58,247,0.3)',
  },
  pointsNum: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '2rem', color: 'white', lineHeight: 1,
  },
  pointsLabel: {
    fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: 4,
  },
  hint: {
    fontSize: '0.82rem', color: '#9898AD', textAlign: 'center',
    maxWidth: 260,
  },
}
