import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/shared/BottomNav'

const PAGE_SIZE = 20

export default function StudentHistory() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => { fetchTx(0, true) }, [])

  async function fetchTx(pageNum, reset = false) {
    if (reset) setLoading(true); else setLoadingMore(true)
    const { data } = await supabase
      .from('point_transactions')
      .select('*, teacher:teacher_id(nickname)')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    const rows = data || []
    if (reset) setTransactions(rows); else setTransactions(prev => [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setPage(pageNum)
    setLoading(false)
    setLoadingMore(false)
  }

  const earn = transactions.filter(t => t.transaction_type !== 'spend').reduce((s, t) => s + t.points, 0)
  const spend = transactions.filter(t => t.transaction_type === 'spend').reduce((s, t) => s + t.points, 0)

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/student')} style={styles.backBtn}>← กลับ</button>
        <div style={styles.headerTitle}>ประวัติทั้งหมด</div>
        <div style={{ width: 40 }} />
      </div>

      {/* Summary */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNum(true)}>+{earn}</div>
          <div style={styles.summaryLabel}>แต้มที่ได้รับ</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNum(false)}>-{spend}</div>
          <div style={styles.summaryLabel}>แต้มที่ใช้</div>
        </div>
      </div>

      {/* List */}
      <div style={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state"><span className="emoji">📜</span><p>ยังไม่มีประวัติ</p></div>
        ) : (
          <>
            <div style={styles.list}>
              {transactions.map(tx => <TxRow key={tx.id} tx={tx} />)}
            </div>
            {hasMore && (
              <button
                className="btn btn-secondary btn-full"
                onClick={() => fetchTx(page + 1)}
                disabled={loadingMore}
                style={{ marginTop: 8 }}
              >
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
      <BottomNav role="student" />
    </div>
  )
}

function TxRow({ tx }) {
  const isEarn = tx.transaction_type !== 'spend'
  const date = new Date(tx.created_at)
  const timeStr = `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`
  return (
    <div style={styles.txItem}>
      <div style={{ ...styles.txDot, background: isEarn ? '#00D9A3' : '#FF6B6B' }} />
      <div style={styles.txInfo}>
        <div style={styles.txReason}>{tx.reason || (isEarn ? 'รับแต้ม' : 'ใช้แต้ม')}</div>
        {tx.teacher && <div style={styles.txSub}>โดย {tx.teacher.nickname}</div>}
        <div style={styles.txSub}>{timeStr}</div>
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
  summaryRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px 16px 0' },
  summaryCard: {
    background: 'white', borderRadius: 14, padding: '14px',
    textAlign: 'center', boxShadow: '0 2px 10px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.06)',
  },
  summaryNum: (isEarn) => ({
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.5rem',
    color: isEarn ? '#00D9A3' : '#FF6B6B', lineHeight: 1,
  }),
  summaryLabel: { fontSize: '0.7rem', color: '#9898AD', marginTop: 4 },
  content: { padding: '16px' },
  list: {
    background: 'white', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(108,58,247,0.06)',
    border: '1px solid rgba(108,58,247,0.08)',
  },
  txItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 16px', borderBottom: '1px solid #F4F4F6',
  },
  txDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  txInfo: { flex: 1, minWidth: 0 },
  txReason: {
    fontSize: '0.88rem', fontWeight: 600, color: '#1A1A2E',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  txSub: { fontSize: '0.72rem', color: '#9898AD', marginTop: 2 },
  txPts: { fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
}