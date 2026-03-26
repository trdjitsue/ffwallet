import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import { AvatarSVG, DEFAULT_AVATAR } from '../../components/shared/AvatarBuilder'
import BottomNav from '../../components/shared/BottomNav'

export default function TeacherCourseDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { toast, showToast } = useToast()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [bulkPoints, setBulkPoints] = useState('')
  const [bulkReason, setBulkReason] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState([])
  const [submittingBulk, setSubmittingBulk] = useState(false)

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [courseRes, membersRes] = await Promise.all([
      supabase.from('courses').select('*').eq('id', id).single(),
      supabase.from('course_members')
        .select('*, student:student_id(*)')
        .eq('course_id', id)
        .order('joined_at'),
    ])
    setCourse(courseRes.data)
    setMembers(membersRes.data || [])
    setLoading(false)
  }

  async function handleAssign() {
    if (!selectedStudent || !points) { showToast('ใส่จำนวนแต้ม', 'error'); return }
    const pts = parseInt(points)
    if (isNaN(pts) || pts <= 0) { showToast('ใส่ตัวเลขบวก', 'error'); return }
    setAssigning(true)
    try {
      const { error } = await supabase.from('point_transactions').insert({
        student_id: selectedStudent.id,
        teacher_id: profile.id,
        points: pts,
        transaction_type: 'earn',
        reason: reason.trim() || 'ครูให้แต้ม',
      })
      if (error) throw error
      showToast(`✅ ให้ ${pts} แต้มแก่ ${selectedStudent.nickname} สำเร็จ!`, 'success')
      setSelectedStudent(null)
      setPoints('')
      setReason('')
      fetchData()
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setAssigning(false) }
  }

  async function handleBulkAssign() {
    if (bulkSelected.length === 0) { showToast('เลือกนักเรียนก่อน', 'error'); return }
    if (!bulkPoints) { showToast('ใส่จำนวนแต้ม', 'error'); return }
    const pts = parseInt(bulkPoints)
    if (isNaN(pts) || pts <= 0) { showToast('ใส่ตัวเลขบวก', 'error'); return }
    setSubmittingBulk(true)
    try {
      const inserts = bulkSelected.map(sid => ({
        student_id: sid,
        teacher_id: profile.id,
        points: pts,
        transaction_type: 'earn',
        reason: bulkReason.trim() || 'ครูให้แต้ม (bulk)',
      }))
      const { error } = await supabase.from('point_transactions').insert(inserts)
      if (error) throw error
      showToast(`✅ ให้ ${pts} แต้มแก่ ${bulkSelected.length} คนสำเร็จ!`, 'success')
      setBulkMode(false)
      setBulkSelected([])
      setBulkPoints('')
      setBulkReason('')
      fetchData()
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setSubmittingBulk(false) }
  }

  function toggleBulkSelect(id) {
    setBulkSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setBulkSelected(members.map(m => m.student_id))
  }

  async function removeMember(memberId) {
    await supabase.from('course_members').delete().eq('id', memberId)
    fetchData()
    showToast('นำนักเรียนออกแล้ว', 'info')
  }

  if (!course && !loading) return <div style={{ padding: 40, textAlign: 'center' }}>ไม่พบคอร์ส</div>

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/teacher/courses')} style={styles.backBtn}>← กลับ</button>
        <div style={{ flex: 1 }}>
          <div style={styles.headerTitle}>{course?.title || '...'}</div>
          <div style={styles.headerSub}>
            รหัส: <span style={styles.code}>{course?.join_code}</span>
            · {members.length} คน
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => { setBulkMode(false); setSelectedStudent(null) }}
        >
          👤 ให้แต้มทีละคน
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={() => { setBulkMode(true); setSelectedStudent(null); setBulkSelected([]) }}
        >
          ⚡ Bulk ให้แต้ม
        </button>
      </div>

      {/* Bulk assign bar */}
      {bulkMode && (
        <div style={styles.bulkBar}>
          <div style={styles.bulkTop}>
            <span style={styles.bulkCount}>เลือก {bulkSelected.length}/{members.length} คน</span>
            <button style={styles.selectAllBtn} onClick={selectAll}>เลือกทั้งหมด</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="แต้ม"
              value={bulkPoints}
              onChange={e => setBulkPoints(e.target.value)}
              style={{ flex: 1, fontFamily: 'Sora', fontWeight: 700, textAlign: 'center' }}
            />
            <input
              className="input"
              placeholder="เหตุผล"
              value={bulkReason}
              onChange={e => setBulkReason(e.target.value)}
              style={{ flex: 2 }}
            />
          </div>
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 8 }}
            onClick={handleBulkAssign}
            disabled={submittingBulk || bulkSelected.length === 0}
          >
            {submittingBulk
              ? <><span className="spinner" /> กำลังให้แต้ม...</>
              : `⚡ ให้แต้ม ${bulkSelected.length} คน`
            }
          </button>
        </div>
      )}

      {/* Members List */}
      <div style={styles.content}>
        <div style={styles.sectionTitle}>นักเรียนในคอร์ส</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">👥</span>
            <p>ยังไม่มีนักเรียน<br />แชร์รหัส <strong>{course?.join_code}</strong> ให้นักเรียน</p>
          </div>
        ) : members.map((m, i) => {
          const s = m.student
          const avatarConfig = s?.avatar_config ? JSON.parse(s.avatar_config) : { ...DEFAULT_AVATAR, skinColor: s?.avatar_color || '#FDDBB4' }
          const isSelected = bulkSelected.includes(m.student_id)

          return (
            <div
              key={m.id}
              style={{
                ...styles.memberRow,
                ...(isSelected ? styles.memberSelected : {}),
                ...(selectedStudent?.id === s?.id ? styles.memberActive : {}),
              }}
              onClick={() => {
                if (bulkMode) toggleBulkSelect(m.student_id)
                else setSelectedStudent(selectedStudent?.id === s?.id ? null : s)
              }}
            >
              {bulkMode && (
                <div style={{ ...styles.checkbox, ...(isSelected ? styles.checkboxChecked : {}) }}>
                  {isSelected && '✓'}
                </div>
              )}
              <div style={styles.rank}>#{i + 1}</div>
              <div style={styles.avatar}>
                <AvatarSVG config={avatarConfig} size={38} />
              </div>
              <div style={styles.info}>
                <div style={styles.name}>{s?.nickname}</div>
                <div style={styles.meta}>{s?.first_name} {s?.last_name}</div>
              </div>
              <div style={styles.pts}>{s?.points || 0}<span style={styles.ptsLabel}> แต้ม</span></div>
              {!bulkMode && (
                <button style={styles.removeBtn} onClick={e => { e.stopPropagation(); removeMember(m.id) }}>✕</button>
              )}
            </div>
          )
        })}
      </div>

      {/* Assign modal for single student */}
      {selectedStudent && !bulkMode && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={styles.modalHeader}>
              <div style={styles.modalAvatar}>
                <AvatarSVG
                  config={selectedStudent.avatar_config ? JSON.parse(selectedStudent.avatar_config) : { ...DEFAULT_AVATAR, skinColor: selectedStudent.avatar_color }}
                  size={52}
                />
              </div>
              <div>
                <div style={styles.modalName}>{selectedStudent.nickname}</div>
                <div style={styles.modalMeta}>{selectedStudent.first_name} {selectedStudent.last_name}</div>
                <div style={styles.modalPts}>💰 {selectedStudent.points} แต้ม</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div className="input-group">
                <label className="input-label">จำนวนแต้ม</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  placeholder="เช่น 10"
                  value={points}
                  onChange={e => setPoints(e.target.value)}
                  style={{ fontSize: '1.4rem', fontFamily: 'Sora', fontWeight: 700, textAlign: 'center' }}
                  autoFocus
                />
              </div>
              <div style={styles.quickPts}>
                {[1, 2, 3, 5, 10, 20, 50, 100].map(p => (
                  <button key={p} style={styles.quickPtBtn} onClick={() => setPoints(String(p))}>+{p}</button>
                ))}
              </div>
              <div className="input-group">
                <label className="input-label">เหตุผล</label>
                <input className="input" placeholder="เช่น ตอบถูก" value={reason}
                  onChange={e => setReason(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedStudent(null)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleAssign} disabled={assigning || !points}>
                {assigning ? <><span className="spinner" /> กำลังให้...</> : `⭐ ให้ ${points || '?'} แต้ม`}
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
    display: 'flex', alignItems: 'flex-start', gap: 12,
  },
  backBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.9rem',
    cursor: 'pointer', paddingTop: 2, flexShrink: 0,
  },
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'white' },
  headerSub: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  code: { fontFamily: 'Space Mono', fontWeight: 700, letterSpacing: '0.08em', color: '#F5C842' },
  actions: { display: 'flex', gap: 10, padding: '14px 16px 0' },
  bulkBar: {
    margin: '10px 16px 0',
    background: 'white', borderRadius: 14, padding: '14px',
    boxShadow: '0 2px 12px rgba(108,58,247,0.1)',
    border: '2px solid rgba(108,58,247,0.15)',
  },
  bulkTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  bulkCount: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#6C3AF7' },
  selectAllBtn: {
    fontSize: '0.78rem', fontWeight: 600, color: '#6C3AF7',
    background: '#EDE5FF', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
  },
  content: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E', marginBottom: 4 },
  memberRow: {
    background: 'white', borderRadius: 12, padding: '10px 14px',
    display: 'flex', alignItems: 'center', gap: 10,
    boxShadow: '0 1px 8px rgba(108,58,247,0.06)',
    border: '2px solid transparent',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  memberSelected: { border: '2px solid #6C3AF7', background: '#F5F0FF' },
  memberActive: { border: '2px solid #F5C842', background: '#FFFDF0' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, border: '2px solid #D0D0DC',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.75rem', fontWeight: 800, color: 'white', flexShrink: 0,
    transition: 'all 0.15s',
  },
  checkboxChecked: { background: '#6C3AF7', border: '2px solid #6C3AF7' },
  rank: { fontFamily: 'Space Mono', fontSize: '0.72rem', color: '#9898AD', width: 24, flexShrink: 0 },
  avatar: { width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E' },
  meta: { fontSize: '0.72rem', color: '#9898AD', marginTop: 1 },
  pts: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#6C3AF7', flexShrink: 0 },
  ptsLabel: { fontSize: '0.65rem', fontWeight: 500, color: '#9898AD' },
  removeBtn: {
    width: 26, height: 26, borderRadius: '50%', border: 'none',
    background: '#F4F4F6', color: '#9898AD', cursor: 'pointer',
    fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  modalHeader: { display: 'flex', gap: 14, alignItems: 'center', marginBottom: 4 },
  modalAvatar: { width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid #EDE5FF' },
  modalName: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#1A1A2E' },
  modalMeta: { fontSize: '0.78rem', color: '#9898AD', marginTop: 2 },
  modalPts: { fontSize: '0.82rem', color: '#6C3AF7', fontWeight: 700, marginTop: 3 },
  quickPts: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  quickPtBtn: {
    padding: '8px 14px', borderRadius: 20,
    background: '#EDE5FF', border: '2px solid #D8C9FF',
    color: '#6C3AF7', fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.85rem', cursor: 'pointer',
  },
}