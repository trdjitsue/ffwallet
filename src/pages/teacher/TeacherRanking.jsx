import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/shared/BottomNav'

const PAGE_SIZE = 10

export default function TeacherRanking() {
  const { profile } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchStudents() }, [page, search])

  async function fetchStudents() {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'student')
      .order('points', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (search.trim()) {
      query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'student')
        .or(`nickname.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        .order('points', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    }

    const { data, count } = await query
    setStudents(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const startRank = (page - 1) * PAGE_SIZE

  const MEDAL = ['🥇', '🥈', '🥉']

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>🏆 อันดับนักเรียน</div>
        <div style={styles.totalBadge}>{total} คน</div>
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <input
          className="input"
          placeholder="🔍 ค้นหาชื่อนักเรียน..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* List */}
      <div style={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">🔍</span>
            <p>ไม่พบนักเรียน</p>
          </div>
        ) : (
          students.map((s, i) => {
            const rank = startRank + i + 1
            const isTop = rank <= 3 && !search
            return (
              <div key={s.id} style={{ ...styles.row, ...(isTop ? styles.rowTop : {}) }}>
                {/* Rank */}
                <div style={styles.rank}>
                  {rank <= 3 && !search
                    ? <span style={styles.medal}>{MEDAL[rank - 1]}</span>
                    : <span style={styles.rankNum}>#{rank}</span>
                  }
                </div>

                {/* Avatar */}
                <div style={styles.avatar(s.avatar_color)}>
                  {s.nickname?.[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div style={styles.info}>
                  <div style={styles.name}>{s.nickname}</div>
                  <div style={styles.meta}>{s.first_name} {s.last_name} · {s.school}</div>
                </div>

                {/* Points */}
                <div style={styles.pointsWrap}>
                  <div style={{ ...styles.points, color: isTop ? '#6C3AF7' : '#1A1A2E' }}>
                    {s.points.toLocaleString()}
                  </div>
                  <div style={styles.pointsLabel}>แต้ม</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{ ...styles.pageBtn, opacity: page === 1 ? 0.4 : 1 }}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >← ก่อนหน้า</button>

          <span style={styles.pageInfo}>
            หน้า {page} / {totalPages}
          </span>

          <button
            style={{ ...styles.pageBtn, opacity: page === totalPages ? 0.4 : 1 }}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >ถัดไป →</button>
        </div>
      )}

      <div style={{ height: 80 }} />
      <BottomNav role={profile?.role} />
    </div>
  )
}

const styles = {
  page: { minHeight: '100dvh', background: '#F5F0FF' },
  header: {
    background: 'linear-gradient(135deg, #6C3AF7 0%, #4519C9 100%)',
    padding: '52px 20px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white' },
  totalBadge: {
    background: 'rgba(255,255,255,0.2)', borderRadius: 20,
    padding: '4px 14px', color: 'white',
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.85rem',
  },
  searchWrap: { padding: '16px 16px 8px' },
  content: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  row: {
    background: 'white', borderRadius: 14, padding: '12px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: '0 2px 8px rgba(108,58,247,0.07)',
    border: '1px solid rgba(108,58,247,0.06)',
    animation: 'fadeIn 0.3s ease',
  },
  rowTop: {
    border: '2px solid rgba(108,58,247,0.2)',
    background: 'linear-gradient(135deg, #FDFBFF, #F5F0FF)',
    boxShadow: '0 4px 16px rgba(108,58,247,0.12)',
  },
  rank: { width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  medal: { fontSize: '1.5rem' },
  rankNum: {
    fontFamily: 'Space Mono, monospace', fontWeight: 700,
    fontSize: '0.85rem', color: '#9898AD',
  },
  avatar: (color) => ({
    width: 40, height: 40, borderRadius: '50%',
    background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1rem', fontWeight: 800, color: 'white',
    fontFamily: 'Sora, sans-serif', flexShrink: 0,
  }),
  info: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.92rem', color: '#1A1A2E',
  },
  meta: {
    fontSize: '0.72rem', color: '#9898AD', marginTop: 2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  pointsWrap: { flexShrink: 0, textAlign: 'right' },
  points: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1,
  },
  pointsLabel: { fontSize: '0.65rem', color: '#9898AD', marginTop: 2 },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px',
  },
  pageBtn: {
    padding: '10px 16px', borderRadius: 12,
    background: 'white', border: '2px solid rgba(108,58,247,0.15)',
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.82rem',
    color: '#6C3AF7', cursor: 'pointer',
  },
  pageInfo: {
    fontFamily: 'Sora, sans-serif', fontWeight: 600,
    fontSize: '0.85rem', color: '#6E6E88',
  },
}