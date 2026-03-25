import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/shared/BottomNav'

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [animPoints, setAnimPoints] = useState(0)

  useEffect(() => {
    if (profile) {
      fetchTransactions()
      animatePoints(profile.points)
    }
  }, [profile?.id])

  async function fetchTransactions() {
    const { data } = await supabase
      .from('point_transactions')
      .select('*, teacher:teacher_id(nickname)')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setTransactions(data || [])
    setLoading(false)
  }

  function animatePoints(target) {
    const duration = 1200
    const startTime = performance.now()
    function update(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimPoints(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(update)
    }
    requestAnimationFrame(update)
  }

  if (!profile) return null

  const initials = profile.nickname?.[0]?.toUpperCase() || '?'

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.avatar(profile.avatar_color)}>{initials}</div>
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
        <div style={styles.scoreBig}>{animPoints.toLocaleString()}</div>
        <div style={styles.scoreUnit}>คะแนน</div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>ประวัติล่าสุด</div>
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
  avatar: (color) => ({
    width: 44, height: 44, borderRadius: '50%',
    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.1rem', fontWeight: 800, color: 'white',
    fontFamily: 'Sora, sans-serif',
    border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0,
  }),
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
    animation: 'scaleIn 0.4s ease',
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
    animation: 'pointBurst 0.5s ease forwards',
  },
  scoreUnit: {
    fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Sora, sans-serif', marginTop: 6,
  },
  section: { padding: '16px', animation: 'fadeIn 0.4s ease 0.2s both' },
  sectionTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '1rem', color: '#1A1A2E', marginBottom: 12,
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