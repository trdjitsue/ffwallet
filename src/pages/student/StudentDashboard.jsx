import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/shared/BottomNav'
import { AvatarSVG, DEFAULT_AVATAR } from '../../components/shared/AvatarBuilder'

export default function StudentDashboard() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [displayPoints, setDisplayPoints] = useState(0)

  useEffect(() => {
    if (!profile) return
    fetchTransactions()
    animatePoints(profile.points)

    // Realtime: listen for new transactions for this student
    const channel = supabase
      .channel('student-points-' + profile.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'point_transactions',
        filter: `student_id=eq.${profile.id}`,
      }, async () => {
        await refreshProfile()
        fetchTransactions()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile?.id])

  // Animate whenever profile.points changes
  useEffect(() => {
    if (profile) animatePoints(profile.points)
  }, [profile?.points])

  async function fetchTransactions() {
    const { data } = await supabase
      .from('point_transactions')
      .select('*, teacher:teacher_id(nickname)')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setTransactions(data || [])
    setLoading(false)
  }

  function animatePoints(target) {
    const duration = 1000
    const startTime = performance.now()
    const startVal = displayPoints
    function update(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayPoints(Math.round(startVal + eased * (target - startVal)))
      if (progress < 1) requestAnimationFrame(update)
    }
    requestAnimationFrame(update)
  }

  if (!profile) return null

  const initials = profile.nickname?.[0]?.toUpperCase() || '?'
  const avatarConfig = profile.avatar_config ? JSON.parse(profile.avatar_config) : { ...DEFAULT_AVATAR, skinColor: profile.avatar_color || '#FDDBB4' }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.avatarWrap}>
            <AvatarSVG config={avatarConfig} size={44} />
          </div>
          <div>
            <div style={styles.nickname}>{profile.nickname} 👋</div>
            <div style={styles.school}>{profile.school}</div>
          </div>
        </div>
        <button onClick={signOut} style={styles.signOutBtn}>ออก</button>
      </div>

      <div style={styles.scoreCard}>
        <div style={styles.orb1} />
        <div style={styles.orb2} />
        <div style={styles.scoreLabel}>แต้มของฉัน</div>
        <div style={styles.scoreBig}>{displayPoints.toLocaleString()}</div>
        <div style={styles.scoreUnit}>คะแนน</div>
      </div>

      {/* FF Tournament */}
      <div style={styles.tournamentCard}>
        <div style={styles.tournamentLeft}>
          <div style={styles.tournamentBadge}>เร็วๆ นี้</div>
          <div style={styles.tournamentTitle}>FF Tournament</div>
          <div style={styles.tournamentSub}>Coming Soon...</div>
        </div>
        <div style={styles.tournamentEmoji}>🏆</div>
      </div>

      <div style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={styles.sectionTitle}>ประวัติล่าสุด</div>
          <a href="/student/history" style={styles.seeAll}>ดูทั้งหมด →</a>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9898AD' }}>กำลังโหลด...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">📜</span>
            <p>ยังไม่มีประวัติ</p>
          </div>
        ) : (
          <div style={styles.transactionList}>
            {transactions.map(tx => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 80 }} />
      <BottomNav role="student" />
    </div>
  )
}

function TransactionItem({ tx }) {
  const isEarn = tx.transaction_type === 'earn' || (tx.transaction_type === 'admin_adjust' && tx.points > 0)
  const date = new Date(tx.created_at)
  const timeStr = `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`

  return (
    <div style={styles.txItem}>
      <div style={{ ...styles.txDot, background: isEarn ? '#00D9A3' : '#FF6B6B' }} />
      <div style={styles.txInfo}>
        <div style={styles.txReason}>{tx.reason || (isEarn ? 'รับแต้ม' : 'ใช้แต้ม')}</div>
        {tx.teacher && <div style={styles.txTeacher}>โดย {tx.teacher.nickname}</div>}
        <div style={styles.txTime}>{timeStr}</div>
      </div>
      <div style={{ ...styles.txPoints, color: isEarn ? '#00D9A3' : '#FF6B6B' }}>
        {isEarn ? '+' : '-'}{Math.abs(tx.points)}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100dvh', background: '#F5F0FF', paddingBottom: 80 },
  header: {
    background: 'linear-gradient(135deg, #6C3AF7 0%, #4519C9 100%)',
    padding: '52px 20px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerContent: { display: 'flex', alignItems: 'center', gap: 12 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0,
    background: 'white',
  },
  nickname: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'white' },
  school: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  signOutBtn: {
    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 20, padding: '6px 14px',
    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
  },
  scoreCard: {
    margin: '16px',
    background: 'linear-gradient(135deg, #6C3AF7 0%, #2D0EA3 100%)',
    borderRadius: 24, padding: '40px 24px 36px',
    textAlign: 'center', position: 'relative', overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(108,58,247,0.4)',
  },
  orb1: {
    position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
  },
  orb2: {
    position: 'absolute', bottom: -40, left: -40, width: 130, height: 130, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,200,66,0.15) 0%, transparent 70%)',
  },
  scoreLabel: {
    fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    fontFamily: 'Sora, sans-serif', marginBottom: 8,
  },
  scoreBig: {
    fontFamily: 'Sora, sans-serif', fontSize: '6rem', fontWeight: 800,
    color: 'white', lineHeight: 1,
    textShadow: '0 4px 24px rgba(0,0,0,0.2)',
    letterSpacing: '-0.04em',
  },
  scoreUnit: {
    fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Sora, sans-serif', marginTop: 6,
  },
  section: { padding: '16px' },
  tournamentCard: {
    margin: '0 16px 16px',
    background: 'linear-gradient(135deg, #1A0760 0%, #4519C9 60%, #6C3AF7 100%)',
    borderRadius: 20, padding: '20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 8px 24px rgba(26,7,96,0.3)',
    position: 'relative', overflow: 'hidden',
  },
  tournamentLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
  tournamentBadge: {
    display: 'inline-block',
    background: '#F5C842', color: '#1A0760',
    fontSize: '0.65rem', fontWeight: 800,
    borderRadius: 20, padding: '2px 10px',
    letterSpacing: '0.05em', textTransform: 'uppercase',
    width: 'fit-content',
  },
  tournamentTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.3rem', color: 'white', letterSpacing: '-0.02em',
  },
  tournamentSub: {
    fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Space Mono, monospace',
  },
  tournamentEmoji: {
    fontSize: '3rem', animation: 'float 3s ease infinite',
  },
  sectionTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '1rem', color: '#1A1A2E',
  },
  seeAll: {
    fontFamily: 'Sora, sans-serif', fontWeight: 600,
    fontSize: '0.8rem', color: '#6C3AF7', textDecoration: 'none',
  },
  transactionList: {
    background: 'white', borderRadius: 16,
    border: '1px solid rgba(108,58,247,0.08)', overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(108,58,247,0.06)',
  },
  txItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderBottom: '1px solid #F4F4F6',
  },
  txDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  txInfo: { flex: 1, minWidth: 0 },
  txReason: {
    fontSize: '0.88rem', fontWeight: 600, color: '#1A1A2E',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  txTeacher: { fontSize: '0.75rem', color: '#9898AD', marginTop: 2 },
  txTime: { fontSize: '0.72rem', color: '#9898AD' },
  txPoints: { fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
}