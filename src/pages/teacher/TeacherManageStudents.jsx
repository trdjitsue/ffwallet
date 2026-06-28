import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

export default function TeacherManageStudents() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchStudents() }, [])

  async function fetchStudents() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, first_name, last_name, username, school, points, avatar_color')
      .eq('role', 'student')
      .order('nickname', { ascending: true })
    setStudents(data || [])
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_student', { target_id: confirmTarget.id })
      if (error) throw error
      showToast(`ลบ ${confirmTarget.nickname} ออกจากระบบแล้ว`, 'success')
      setStudents(prev => prev.filter(s => s.id !== confirmTarget.id))
      setConfirmTarget(null)
    } catch (err) {
      showToast('ลบไม่สำเร็จ: ' + (err?.message || 'unknown'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? students.filter(s =>
        (s.nickname || '').toLowerCase().includes(q) ||
        (s.first_name || '').toLowerCase().includes(q) ||
        (s.last_name || '').toLowerCase().includes(q) ||
        (s.username || '').toLowerCase().includes(q)
      )
    : students

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      <div style={styles.header}>
        <button onClick={() => navigate('/teacher')} style={styles.backBtn}>← กลับ</button>
        <div style={styles.headerTitle}>🗑️ ลบไอดีนักเรียน</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.warnBox}>
          ⚠️ การลบจะลบนักเรียนออกจากระบบถาวร รวมถึงแต้ม ประวัติ และข้อมูลทั้งหมด — กู้คืนไม่ได้
        </div>

        <div className="input-group" style={{ marginBottom: 14 }}>
          <input className="input" placeholder="🔍 ค้นหาด้วยชื่อเล่น, ชื่อ, username..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 20 }}>
            <span className="emoji">👤</span>
            <p>{q ? `ไม่พบ "${search}"` : 'ยังไม่มีนักเรียน'}</p>
          </div>
        ) : (
          <>
            <div style={styles.countText}>ทั้งหมด {filtered.length} คน</div>
            <div style={styles.list}>
              {filtered.map(s => (
                <div key={s.id} style={styles.item}>
                  <div style={styles.sAvatar(s.avatar_color)}>{s.nickname?.[0]?.toUpperCase()}</div>
                  <div style={styles.info}>
                    <div style={styles.name}>{s.nickname}</div>
                    <div style={styles.meta}>{s.first_name} {s.last_name} · @{s.username}</div>
                    <div style={styles.pts}>💰 {s.points} แต้ม{s.school ? ` · ${s.school}` : ''}</div>
                  </div>
                  <button style={styles.delBtn} onClick={() => setConfirmTarget(s)}>ลบ</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirmTarget(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
              <h2 style={styles.modalTitle}>ยืนยันการลบ</h2>
              <p style={styles.confirmText}>
                ต้องการลบ <strong>{confirmTarget.nickname}</strong><br />
                ({confirmTarget.first_name} {confirmTarget.last_name} · @{confirmTarget.username})<br />
                ออกจากระบบถาวรใช่หรือไม่?
              </p>
              <div style={styles.confirmWarn}>
                แต้ม {confirmTarget.points} แต้ม และประวัติทั้งหมดจะหายไป กู้คืนไม่ได้
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => setConfirmTarget(null)} disabled={deleting}>ยกเลิก</button>
              <button className="btn btn-danger" style={{ flex: 2 }}
                onClick={handleDelete} disabled={deleting}>
                {deleting ? <><span className="spinner" /> กำลังลบ...</> : '🗑️ ลบถาวร'}
              </button>
            </div>
          </div>
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
    padding: '52px 16px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  },
  backBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', flexShrink: 0,
  },
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: 'white', flex: 1, textAlign: 'center' },
  content: { padding: '16px' },
  warnBox: {
    background: '#FFF9E0', border: '1px solid #F5C842', borderRadius: 12,
    padding: '12px 14px', fontSize: '0.8rem', color: '#8a6500', fontWeight: 600,
    marginBottom: 14, lineHeight: 1.5,
  },
  countText: { fontSize: '0.8rem', color: '#9898AD', marginBottom: 10 },
  list: {
    background: 'white', borderRadius: 14, overflow: 'hidden',
    border: '1px solid rgba(108,58,247,0.08)', boxShadow: '0 2px 10px rgba(108,58,247,0.06)',
  },
  item: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid #F4F4F6' },
  sAvatar: (color) => ({
    width: 42, height: 42, borderRadius: '50%', background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1rem', fontWeight: 800, color: 'white', flexShrink: 0, fontFamily: 'Sora, sans-serif',
  }),
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E' },
  meta: { fontSize: '0.74rem', color: '#9898AD', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pts: { fontSize: '0.74rem', color: '#6C3AF7', fontWeight: 600, marginTop: 2 },
  delBtn: {
    flexShrink: 0, background: '#FFE5E5', color: '#C53030', border: 'none',
    borderRadius: 10, padding: '8px 16px', fontFamily: 'Sora, sans-serif',
    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
  },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#1A1A2E' },
  confirmText: { fontSize: '0.9rem', color: '#4A4A62', lineHeight: 1.7, marginTop: 10 },
  confirmWarn: {
    background: '#FFE5E5', color: '#C53030', borderRadius: 10,
    padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, marginTop: 14, lineHeight: 1.5,
  },
}