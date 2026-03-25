import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const { toast, showToast } = useToast()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [adjustPts, setAdjustPts] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [profilesRes, txRes, testsRes, redemptionsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('points', { ascending: false }),
      supabase.from('point_transactions').select('id', { count: 'exact' }),
      supabase.from('tests').select('id', { count: 'exact' }),
      supabase.from('redemptions').select('id', { count: 'exact' }).eq('status', 'pending'),
    ])

    const all = profilesRes.data || []
    setUsers(all)
    setStats({
      total: all.length,
      students: all.filter(u => u.role === 'student').length,
      teachers: all.filter(u => u.role === 'teacher').length,
      totalTx: txRes.count || 0,
      tests: testsRes.count || 0,
      pending: redemptionsRes.count || 0,
      totalPoints: all.filter(u => u.role === 'student').reduce((s, u) => s + u.points, 0),
    })
    setLoading(false)
  }

  async function handleAdjustPoints(type) {
    if (!selectedUser || !adjustPts) { showToast('ใส่จำนวนแต้ม', 'error'); return }
    const pts = parseInt(adjustPts)
    if (isNaN(pts) || pts <= 0) { showToast('ใส่ตัวเลขบวก', 'error'); return }

    setAdjusting(true)
    try {
      const finalPts = type === 'remove' ? -pts : pts
      const { error } = await supabase.from('point_transactions').insert({
        student_id: selectedUser.id,
        teacher_id: profile.id,
        points: Math.abs(pts),
        transaction_type: type === 'remove' ? 'spend' : 'admin_adjust',
        reason: adjustReason || (type === 'remove' ? 'Admin ลดแต้ม' : 'Admin เพิ่มแต้ม'),
      })
      if (error) throw error

      showToast(`${type === 'remove' ? 'ลด' : 'เพิ่ม'} ${pts} แต้มให้ ${selectedUser.nickname} สำเร็จ`, 'success')
      setSelectedUser(null)
      setAdjustPts('')
      setAdjustReason('')
      fetchAll()
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error')
    } finally {
      setAdjusting(false)
    }
  }

  async function changeRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    showToast(`เปลี่ยนสิทธิ์เป็น ${newRole} แล้ว`, 'success')
    fetchAll()
    setSelectedUser(null)
  }

  const filteredUsers = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.nickname?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q)
  })

  const ROLE_COLOR = { student: '#6C3AF7', teacher: '#00D9A3', admin: '#FF6B6B' }
  const ROLE_LABEL = { student: '📚 นักเรียน', teacher: '🎓 ครู', admin: '⚡ Admin' }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>⚡ Admin Panel</div>
          <div style={styles.headerSub}>{profile?.nickname} · {profile?.school}</div>
        </div>
        <button onClick={signOut} style={styles.signOutBtn}>ออก</button>
      </div>

      {/* Stats */}
      <div style={styles.statsScroll}>
        {[
          { icon: '👥', num: stats.students, label: 'นักเรียน', color: '#6C3AF7' },
          { icon: '🎓', num: stats.teachers, label: 'ครู', color: '#00D9A3' },
          { icon: '💰', num: stats.totalPoints, label: 'แต้มในระบบ', color: '#F5C842' },
          { icon: '⭐', num: stats.totalTx, label: 'ธุรกรรมทั้งหมด', color: '#9B72FF' },
          { icon: '📝', num: stats.tests, label: 'กิจกรรม', color: '#4ECDC4' },
          { icon: '⏳', num: stats.pending, label: 'รอการอนุมัติ', color: '#FF6B6B' },
        ].map((s, i) => (
          <div key={i} style={styles.statCard}>
            <div style={styles.statIcon}>{s.icon}</div>
            <div style={{ ...styles.statNum, color: s.color }}>{s.num ?? '...'}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={styles.tabRow}>
        {['overview', 'users', 'leaderboard'].map(t => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => setTab(t)}>
            {t === 'overview' ? '📊 ภาพรวม' : t === 'users' ? '👥 ผู้ใช้' : '🏆 อันดับ'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div style={styles.content}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>📊 สรุประบบ</div>
            {[
              ['ผู้ใช้ทั้งหมด', stats.total],
              ['นักเรียน', stats.students],
              ['ครู', stats.teachers],
              ['ธุรกรรมแต้ม', stats.totalTx],
              ['กิจกรรมในระบบ', stats.tests],
              ['รออนุมัติการแลก', stats.pending],
            ].map(([k, v]) => (
              <div key={k} style={styles.overviewRow}>
                <span>{k}</span>
                <strong style={{ color: '#6C3AF7' }}>{v ?? '-'}</strong>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>🔗 ลิงก์ด่วน</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <a href="/teacher/assign" style={styles.quickLink}>⭐ ให้แต้ม</a>
              <a href="/teacher/tests" style={styles.quickLink}>📝 กิจกรรม</a>
              <a href="/teacher/shop" style={styles.quickLink}>🛍️ ร้านค้า</a>
              <button style={{ ...styles.quickLink, border: 'none', cursor: 'pointer' }} onClick={() => setTab('users')}>👥 ผู้ใช้</button>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div style={styles.content}>
          <input
            className="input"
            placeholder="ค้นหาผู้ใช้..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 4 }}
          />
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#9898AD' }}>กำลังโหลด...</div>
          ) : filteredUsers.map(u => (
            <div key={u.id} style={styles.userRow} onClick={() => setSelectedUser(u)}>
              <div style={styles.uAvatar(u.avatar_color, ROLE_COLOR[u.role])}>
                {u.nickname?.[0]?.toUpperCase()}
              </div>
              <div style={styles.uInfo}>
                <div style={styles.uName}>{u.nickname} <span style={{ ...styles.roleBadge, background: ROLE_COLOR[u.role] + '20', color: ROLE_COLOR[u.role] }}>{ROLE_LABEL[u.role]}</span></div>
                <div style={styles.uMeta}>{u.first_name} {u.last_name} · @{u.username}</div>
                <div style={styles.uSchool}>{u.school}</div>
              </div>
              {u.role === 'student' && (
                <div style={styles.uPts}>
                  <div style={styles.uPtsNum}>{u.points}</div>
                  <div style={styles.uPtsLabel}>แต้ม</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard Tab */}
      {tab === 'leaderboard' && (
        <div style={styles.content}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>🏆 อันดับนักเรียน (แต้มสะสม)</div>
            {users.filter(u => u.role === 'student')
              .sort((a, b) => b.total_points_earned - a.total_points_earned)
              .slice(0, 20)
              .map((u, i) => (
                <div key={u.id} style={styles.lbRow}>
                  <div style={styles.lbRank(i)}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div style={styles.sAvatar(u.avatar_color)}>{u.nickname?.[0]?.toUpperCase()}</div>
                  <div style={styles.lbInfo}>
                    <div style={styles.lbName}>{u.nickname}</div>
                    <div style={styles.lbSchool}>{u.school}</div>
                  </div>
                  <div style={styles.lbPts}>{u.total_points_earned}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />

            <div style={styles.modalUserHeader}>
              <div style={styles.sAvatar(selectedUser.avatar_color)}>
                {selectedUser.nickname?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={styles.modalName}>{selectedUser.nickname}</div>
                <div style={styles.modalMeta}>{selectedUser.first_name} {selectedUser.last_name}</div>
                <div style={styles.modalMeta}>@{selectedUser.username} · {selectedUser.school}</div>
                <span style={{ ...styles.roleBadge, background: ROLE_COLOR[selectedUser.role] + '20', color: ROLE_COLOR[selectedUser.role] }}>
                  {ROLE_LABEL[selectedUser.role]}
                </span>
              </div>
            </div>

            {selectedUser.role === 'student' && (
              <>
                <div style={styles.ptsSummary}>
                  <div style={styles.ptsBlock}>
                    <div style={styles.ptsN}>{selectedUser.points}</div>
                    <div style={styles.ptsL}>แต้มคงเหลือ</div>
                  </div>
                  <div style={styles.ptsBlock}>
                    <div style={styles.ptsN}>{selectedUser.total_points_earned}</div>
                    <div style={styles.ptsL}>แต้มทั้งหมด</div>
                  </div>
                </div>

                <div style={styles.adjustSection}>
                  <div style={styles.cardTitle}>ปรับแต้ม</div>
                  <div className="input-group" style={{ marginBottom: 10 }}>
                    <input className="input" type="number" inputMode="numeric" placeholder="จำนวนแต้ม"
                      value={adjustPts} onChange={e => setAdjustPts(e.target.value)}
                      style={{ fontFamily: 'Sora', fontWeight: 700, textAlign: 'center' }} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 12 }}>
                    <input className="input" placeholder="เหตุผล (ถ้ามี)" value={adjustReason}
                      onChange={e => setAdjustReason(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-sm" style={{ flex: 1, background: '#FFE5E5', color: '#C53030', border: 'none', fontFamily: 'Sora', fontWeight: 700 }}
                      onClick={() => handleAdjustPoints('remove')} disabled={adjusting}>
                      − ลดแต้ม
                    </button>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                      onClick={() => handleAdjustPoints('add')} disabled={adjusting}>
                      + เพิ่มแต้ม
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Change Role */}
            <div style={styles.adjustSection}>
              <div style={styles.cardTitle}>เปลี่ยนสิทธิ์</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['student', 'teacher', 'admin'].map(r => (
                  <button key={r}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: selectedUser.role === r ? ROLE_COLOR[r] : '#F4F4F6',
                      color: selectedUser.role === r ? 'white' : '#6E6E88',
                      fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.75rem',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => selectedUser.role !== r && changeRole(selectedUser.id, r)}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
      <BottomNav role="admin" />
    </div>
  )
}

const styles = {
  page: { minHeight: '100dvh', background: '#F5F0FF' },
  header: {
    background: 'linear-gradient(135deg, #2D0EA3 0%, #6C3AF7 100%)',
    padding: '52px 20px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: 'white',
  },
  headerSub: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  signOutBtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 20, padding: '6px 14px',
    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Sora, sans-serif',
  },
  statsScroll: {
    display: 'flex', gap: 10, padding: '16px', overflowX: 'auto', scrollbarWidth: 'none',
  },
  statCard: {
    background: 'white', borderRadius: 14, padding: '14px',
    textAlign: 'center', flexShrink: 0, minWidth: 80,
    boxShadow: '0 2px 10px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.06)',
  },
  statIcon: { fontSize: '1.2rem', marginBottom: 4 },
  statNum: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.4rem', lineHeight: 1 },
  statLabel: { fontSize: '0.65rem', color: '#9898AD', marginTop: 3 },
  tabRow: {
    display: 'flex', gap: 0, margin: '0 16px 16px', background: 'white',
    borderRadius: 14, padding: 4,
    boxShadow: '0 2px 8px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
  },
  tab: {
    flex: 1, padding: '10px 4px', border: 'none', background: 'transparent',
    borderRadius: 10, fontFamily: 'Sora, sans-serif', fontWeight: 600,
    fontSize: '0.78rem', color: '#9898AD', cursor: 'pointer', transition: 'all 0.2s',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #6C3AF7, #4519C9)',
    color: 'white', boxShadow: '0 2px 8px rgba(108,58,247,0.3)',
  },
  content: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    background: 'white', borderRadius: 16, padding: '16px',
    boxShadow: '0 2px 10px rgba(108,58,247,0.07)',
    border: '1px solid rgba(108,58,247,0.06)',
  },
  cardTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E', marginBottom: 12,
  },
  overviewRow: {
    display: 'flex', justifyContent: 'space-between', padding: '8px 0',
    borderBottom: '1px solid #F4F4F6', fontSize: '0.85rem', color: '#6E6E88',
  },
  quickLink: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px', background: '#F5F0FF', borderRadius: 12,
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.82rem',
    color: '#6C3AF7', textDecoration: 'none', gap: 4,
    border: '1px solid rgba(108,58,247,0.12)',
  },
  userRow: {
    background: 'white', borderRadius: 14, padding: '12px 14px',
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(108,58,247,0.06)',
    border: '1px solid rgba(108,58,247,0.06)',
    transition: 'all 0.15s',
  },
  uAvatar: (color, borderColor) => ({
    width: 38, height: 38, borderRadius: '50%',
    background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.9rem', fontWeight: 800, color: 'white',
    fontFamily: 'Sora, sans-serif', flexShrink: 0,
    border: `2px solid ${borderColor || color || '#6C3AF7'}30`,
  }),
  uInfo: { flex: 1, minWidth: 0 },
  uName: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#1A1A2E',
    display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  },
  uMeta: { fontSize: '0.72rem', color: '#9898AD', marginTop: 2 },
  uSchool: { fontSize: '0.7rem', color: '#B89EFF' },
  uPts: { flexShrink: 0, textAlign: 'center' },
  uPtsNum: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#6C3AF7' },
  uPtsLabel: { fontSize: '0.62rem', color: '#9898AD' },
  roleBadge: {
    fontSize: '0.65rem', fontWeight: 700, borderRadius: 8, padding: '2px 7px',
  },
  lbRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: '1px solid #F4F4F6',
  },
  lbRank: (i) => ({
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: i < 3 ? '1.2rem' : '0.85rem', color: '#9898AD',
    width: 32, textAlign: 'center', flexShrink: 0,
  }),
  sAvatar: (color) => ({
    width: 34, height: 34, borderRadius: '50%',
    background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', fontWeight: 800, color: 'white',
    fontFamily: 'Sora, sans-serif', flexShrink: 0,
  }),
  lbInfo: { flex: 1, minWidth: 0 },
  lbName: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#1A1A2E' },
  lbSchool: { fontSize: '0.7rem', color: '#9898AD' },
  lbPts: {
    fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: '1rem',
    color: '#6C3AF7', flexShrink: 0,
  },
  modalUserHeader: {
    display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16,
  },
  modalName: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#1A1A2E',
  },
  modalMeta: { fontSize: '0.78rem', color: '#9898AD', marginTop: 3 },
  ptsSummary: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16,
  },
  ptsBlock: {
    background: '#F5F0FF', borderRadius: 12, padding: '12px', textAlign: 'center',
  },
  ptsN: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#6C3AF7' },
  ptsL: { fontSize: '0.7rem', color: '#9898AD', marginTop: 2 },
  adjustSection: {
    background: '#FAFAFA', borderRadius: 12, padding: '14px', marginBottom: 12,
  },
}
