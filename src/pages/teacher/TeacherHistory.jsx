import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/shared/BottomNav'

const PAGE_SIZE = 20

export default function TeacherHistory() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => { fetchTx(0, true) }, [])

  async function fetchTx(pageNum, reset = false) {
    if (reset) setLoading(true); else setLoadingMore(true)

    let query = supabase
      .from('point_transactions')
      .select('*, student:student_id(nickname, avatar_color, first_name, last_name)')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    // admin sees all, teacher sees own
    if (profile.role !== 'admin') query = query.eq('teacher_id', profile.id)

    const { data } = await query
    const rows = data || []
    if (reset) setTransactions(rows); else setTransactions(prev => [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setPage(pageNum)
    setLoading(false)
    setLoadingMore(false)
  }

  async function handleSearch(q) {
    setSearch(q)
    if (!q.trim()) { fetchTx(0, true); return }
    setSearching(true)
    let query = supabase
      .from('point_transactions')
      .select('*, student:student_id(nickname, avatar_color, first_name, last_name)')
      .order('created_at', { ascending: false })
    if (profile.role !== 'admin') query = query.eq('teacher_id', profile.id)
    const { data } = await query
    const filtered = (data || []).filter(t =>
      t.student?.nickname?.toLowerCase().includes(q.toLowerCase()) ||
      t.student?.first_name?.toLowerCase().includes(q.toLowerCase()) ||
      t.reason?.toLowerCase().includes(q.toLowerCase())
    )
    setTransactions(filtered)
    setHasMore(false)
    setSearching(false)
  }

  const totalGiven = transactions.reduce((s, t) => t.transaction_type === 'earn' || t.transaction_type === 'admin_adjust' ? s + t.points : s, 0)

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/teacher')} style={styles.backBtn}>← กลับ</button>
        <div style={styles.headerTitle}>ประวัติการให้แต้ม</div>
        <div style={{ width: 40 }} />
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNum}>{transactions.length}</div>
          <div style={styles.summaryLabel}>ครั้งทั้งหมด</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryNum, color: '#00D9A3' }}>+{totalGiven}</div>
          <div style={styles.summaryLabel}>แต้มที่ให้ทั้งหมด</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 16px 12px' }}>
        <input
          className="input"
          placeholder="🔍 ค้นหาชื่อนักเรียน หรือเหตุผล..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div style={styles.content}>
        {loading || searching ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state"><span className="emoji">📜</span><p>ไม่พบประวัติ</p></div>
        ) : (
          <>
            <div style={styles.list}>
              {transactions.map(tx => <TxRow key={tx.id} tx={tx} />)}
            </div>
            {hasMore && (
              <button className="btn btn-secondary btn-full" onClick={() => fetchTx(page + 1)}
                disabled={loadingMore} style={{ marginTop: 8 }}>
                {loadingMore ? <><span className="spinner" /> โหลด...</> : 'โหลดเพิ่ม'}
              </button>
            )}
            {!hasMore && transactions.length > 0 && (
              <div style={{ textAlign: 'center', color: '#9898AD', fontSize: '0.8rem', padding: '12px 0' }}>
                แสดงทั้งหมด {transactions.length} รายการ
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ height: 80 }} />
      <BottomNav role={profile?.role} />
    </div>
  )
}

function TxRow({ tx }) {
  const isEarn = tx.transaction_type !== 'spend'
  const date = new Date(tx.created_at)
  const timeStr = `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`
  const s = tx.student
  return (
    <div style={styles.txItem}>
      <div style={styles.avatar(s?.avatar_color)}>
        {s?.nickname?.[0]?.toUpperCase() || '?'}
      </div>
      <div style={styles.txInfo}>
        <div style={styles.txName}>{s?.nickname} <span style={styles.txFullname}>{s?.first_name} {s?.last_name}</span></div>
        <div style={styles.txReason}>{tx.reason || 'ให้แต้ม'}</div>
        <div style={styles.txTime}>{timeStr}</div>
      </div>
      <div style={{ ...styles.txPts, color: isEarn ? '#00D9A3' : '#FF6B6B' }}>
        {isEarn ? '+' : '-'}{Math.abs(tx.points)}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100dvh', background: '#F5F0FF' },
  header: {
    background: 'linear-gradient(135deg, #6C3AF7 0%, #4519C9 100%)',
    padding: '52px 16px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
  },
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'white' },
  summary: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px 16px 12px' },
  summaryCard: {
    background: 'white', borderRadius: 14, padding: '14px',
    textAlign: 'center', boxShadow: '0 2px 10px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.06)',
  },
  summaryNum: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#6C3AF7', lineHeight: 1 },
  summaryLabel: { fontSize: '0.7rem', color: '#9898AD', marginTop: 4 },
  content: { padding: '0 16px' },
  list: {
    background: 'white', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(108,58,247,0.06)', border: '1px solid rgba(108,58,247,0.08)',
  },
  txItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', borderBottom: '1px solid #F4F4F6',
  },
  avatar: (color) => ({
    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
    background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.9rem', fontWeight: 800, color: 'white', fontFamily: 'Sora, sans-serif',
  }),
  txInfo: { flex: 1, minWidth: 0 },
  txName: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#1A1A2E' },
  txFullname: { fontWeight: 400, color: '#9898AD', fontSize: '0.78rem' },
  txReason: { fontSize: '0.75rem', color: '#6E6E88', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  txTime: { fontSize: '0.7rem', color: '#9898AD', marginTop: 1 },
  txPts: { fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
}