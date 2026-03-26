import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/shared/BottomNav'

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth()
  const [stats, setStats] = useState({ students: 0, transactions: 0, tests: 0, pending: 0 })
  const [recentTx, setRecentTx] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [studentsRes, txRes, testsRes, pendingRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
      supabase.from('point_transactions').select('*', { count: 'exact' }).eq('teacher_id', profile.id),
      supabase.from('tests').select('id', { count: 'exact' }).eq('teacher_id', profile.id),
      supabase.from('redemptions').select('id', { count: 'exact' }).eq('status', 'pending'),
    ])
    setStats({
      students: studentsRes.count || 0,
      transactions: txRes.count || 0,
      tests: testsRes.count || 0,
      pending: pendingRes.count || 0,
    })

    const { data: txData } = await supabase
      .from('point_transactions')
      .select('*, student:student_id(nickname, avatar_color)')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setRecentTx(txData || [])
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.greeting}>สวัสดี, {profile?.nickname} 👋</div>
            <div style={styles.role}>🎓 ครูผู้สอน · {profile?.school}</div>
          </div>
          <button onClick={signOut} style={styles.signOutBtn}>ออก</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        {[
          { icon: '👥', num: stats.students, label: 'นักเรียนทั้งหมด', color: '#6C3AF7' },
          { icon: '⭐', num: stats.transactions, label: 'ครั้งที่ให้แต้ม', color: '#F5C842' },
          { icon: '📝', num: stats.tests, label: 'กิจกรรมที่สร้าง', color: '#00D9A3' },
          { icon: '⏳', num: stats.pending, label: 'รอการอนุมัติ', color: '#FF6B6B' },
        ].map((s, i) => (
          <div key={i} style={styles.statCard}>
            <div style={styles.statIcon}>{s.icon}</div>
            <div style={{ ...styles.statNum, color: s.color }}>{s.num}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>เมนูด่วน</div>
        <div style={styles.quickGrid}>
          <QuickAction href="/teacher/assign" icon="📷" label="สแกน QR" sub="ให้แต้มด้วย QR" color="#6C3AF7" />
          <QuickAction href="/teacher/assign" icon="✍️" label="ให้แต้มด้วยชื่อ" sub="ค้นหาด้วยชื่อ" color="#9B72FF" />
          <QuickAction href="/teacher/tests" icon="➕" label="สร้างกิจกรรม" sub="Quiz & Tasks" color="#00D9A3" />
          <QuickAction href="/teacher/shop" icon="🛍️" label="จัดการร้าน" sub="เพิ่ม/ลบของ" color="#F5C842" />
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={styles.sectionTitle}>แต้มที่ให้ล่าสุด</div>
          <a href="/teacher/history" style={styles.seeAll}>ดูทั้งหมด →</a>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : recentTx.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">⭐</span>
            <p>ยังไม่ได้ให้แต้มใคร</p>
          </div>
        ) : (
          <div style={styles.txList}>
            {recentTx.map(tx => (
              <div key={tx.id} style={styles.txItem}>
                <div style={styles.txAvatar(tx.student?.avatar_color || '#6C3AF7')}>
                  {tx.student?.nickname?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={styles.txInfo}>
                  <div style={styles.txName}>{tx.student?.nickname}</div>
                  <div style={styles.txReason}>{tx.reason || 'ให้แต้ม'}</div>
                </div>
                <div style={{ ...styles.txPts, color: tx.points > 0 ? '#00D9A3' : '#FF6B6B' }}>
                  +{tx.points}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 80 }} />
      <BottomNav role={profile?.role} />
    </div>
  )
}

function QuickAction({ href, icon, label, sub, color }) {
  return (
    <a href={href} style={{ ...styles.quickCard, textDecoration: 'none' }}>
      <div style={{ ...styles.quickIcon, background: color + '20', color }}>{icon}</div>
      <div style={styles.quickLabel}>{label}</div>
      <div style={styles.quickSub}>{sub}</div>
    </a>
  )
}

const styles = {
  page: { minHeight: '100dvh', background: '#F5F0FF' },
  header: {
    background: 'linear-gradient(135deg, #6C3AF7 0%, #2D0EA3 100%)',
    padding: '52px 20px 24px',
  },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.3rem', color: 'white',
  },
  role: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  signOutBtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 20, padding: '6px 14px',
    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Sora, sans-serif',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 12, padding: '16px',
  },
  statCard: {
    background: 'white', borderRadius: 16, padding: '16px',
    textAlign: 'center', boxShadow: '0 2px 12px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.06)',
  },
  statIcon: { fontSize: '1.4rem', marginBottom: 6 },
  statNum: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.8rem', lineHeight: 1,
  },
  statLabel: { fontSize: '0.72rem', color: '#9898AD', marginTop: 4 },
  section: { padding: '0 16px 16px' },
  sectionTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '1rem', color: '#1A1A2E',
  },
  seeAll: {
    fontFamily: 'Sora, sans-serif', fontWeight: 600,
    fontSize: '0.8rem', color: '#6C3AF7', textDecoration: 'none',
  },
  quickGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  quickCard: {
    background: 'white', borderRadius: 16, padding: '16px',
    boxShadow: '0 2px 10px rgba(108,58,247,0.07)',
    border: '1px solid rgba(108,58,247,0.06)',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  quickIcon: {
    width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.2rem', marginBottom: 4,
  },
  quickLabel: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.88rem', color: '#1A1A2E',
  },
  quickSub: { fontSize: '0.72rem', color: '#9898AD' },
  txList: {
    background: 'white', borderRadius: 16,
    boxShadow: '0 2px 12px rgba(108,58,247,0.07)',
    border: '1px solid rgba(108,58,247,0.06)', overflow: 'hidden',
  },
  txItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', borderBottom: '1px solid #F4F4F6',
  },
  txAvatar: (color) => ({
    width: 36, height: 36, borderRadius: '50%',
    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.9rem', fontWeight: 800, color: 'white',
    fontFamily: 'Sora, sans-serif', flexShrink: 0,
  }),
  txInfo: { flex: 1, minWidth: 0 },
  txName: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.88rem', color: '#1A1A2E',
  },
  txReason: { fontSize: '0.75rem', color: '#9898AD', marginTop: 2 },
  txPts: {
    fontFamily: 'Space Mono, monospace', fontWeight: 700,
    fontSize: '1rem', flexShrink: 0,
  },
}