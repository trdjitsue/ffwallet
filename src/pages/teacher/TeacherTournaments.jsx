import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

const emptyForm = { title: '', description: '', entry_cost: 0, max_participants: -1 }

export default function TeacherTournaments() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [tournaments, setTournaments] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTournaments() }, [])

  async function fetchTournaments() {
    let query = supabase
      .from('tournaments')
      .select('*, teacher:teacher_id(nickname)')
      .order('created_at', { ascending: false })
    if (profile.role !== 'admin') query = query.eq('teacher_id', profile.id)
    const { data } = await query
    const list = data || []
    setTournaments(list)
    if (list.length) await fetchCounts(list.map(t => t.id))
    setLoading(false)
  }

  async function fetchCounts(ids) {
    const { data } = await supabase
      .from('tournament_members')
      .select('tournament_id')
      .in('tournament_id', ids)
    const c = {}
    ;(data || []).forEach(m => { c[m.tournament_id] = (c[m.tournament_id] || 0) + 1 })
    ids.forEach(id => { if (!c[id]) c[id] = 0 })
    setCounts(c)
  }

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm)
    setShowCreate(true)
  }

  function openEdit(t) {
    setEditTarget(t)
    setForm({
      title: t.title,
      description: t.description || '',
      entry_cost: t.entry_cost ?? 0,
      max_participants: t.max_participants ?? -1,
    })
    setShowCreate(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { showToast('กรุณาใส่ชื่อ Tournament', 'error'); return }
    setSaving(true)
    try {
      if (editTarget) {
        const { error } = await supabase.from('tournaments').update({
          title: form.title.trim(),
          description: form.description.trim(),
          entry_cost: parseInt(form.entry_cost) || 0,
          max_participants: parseInt(form.max_participants) || -1,
        }).eq('id', editTarget.id)
        if (error) throw error
        showToast('แก้ไข Tournament สำเร็จ!', 'success')
      } else {
        const { error } = await supabase.from('tournaments').insert({
          title: form.title.trim(),
          description: form.description.trim(),
          entry_cost: parseInt(form.entry_cost) || 0,
          max_participants: parseInt(form.max_participants) || -1,
          teacher_id: profile.id,
          is_active: true,
          hall_of_fame: [],
        })
        if (error) throw error
        showToast('สร้าง Tournament สำเร็จ! 🎉', 'success')
      }
      setShowCreate(false)
      setEditTarget(null)
      setForm(emptyForm)
      fetchTournaments()
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setSaving(false) }
  }

  async function toggleActive(t) {
    await supabase.from('tournaments').update({ is_active: !t.is_active }).eq('id', t.id)
    fetchTournaments()
    showToast(t.is_active ? 'ปิดแล้ว' : 'เปิดแล้ว', 'info')
  }

  async function handleDelete(id) {
    if (!window.confirm('ลบ Tournament นี้?')) return
    await supabase.from('tournaments').delete().eq('id', id)
    showToast('ลบแล้ว', 'info')
    fetchTournaments()
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      <div style={styles.header}>
        <button onClick={() => navigate('/teacher')} style={styles.backBtn}>← กลับ</button>
        <div style={styles.headerTitle}>🏆 จัดการ Tournament</div>
        <button className="btn btn-gold btn-sm" onClick={openCreate}>+ สร้าง</button>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : tournaments.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <span className="emoji">🏆</span>
            <p>ยังไม่มี Tournament<br />กด "+ สร้าง" เพื่อเริ่ม</p>
          </div>
        ) : tournaments.map(t => {
          const cnt = counts[t.id] || 0
          const maxP = t.max_participants
          return (
            <div key={t.id} style={{ ...styles.card, opacity: t.is_active ? 1 : 0.6 }}>
              <div style={styles.cardMain}>
                <div style={styles.cardTitle}>{t.title}</div>
                {t.description && <div style={styles.cardDesc}>{t.description}</div>}
                {profile.role === 'admin' && t.teacher && <div style={styles.cardTeacher}>👤 {t.teacher.nickname}</div>}
                <div style={styles.cardMeta}>
                  <span style={styles.costChip}>💰 {t.entry_cost} แต้ม</span>
                  <span style={styles.limitChip}>👥 {cnt}{maxP !== -1 ? ` / ${maxP}` : ''} คน</span>
                  <span style={{ ...styles.statusChip, background: t.is_active ? '#D0FFF4' : '#F4F4F6', color: t.is_active ? '#007A5A' : '#9898AD' }}>
                    {t.is_active ? '● เปิด' : '○ ปิด'}
                  </span>
                </div>
              </div>
              <div style={styles.cardActions}>
                <button style={styles.editBtn} onClick={() => openEdit(t)}>✏️</button>
                <button className="btn btn-sm" style={styles.toggleBtn} onClick={() => toggleActive(t)}>
                  {t.is_active ? 'ปิด' : 'เปิด'}
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/teacher/tournaments/${t.id}`)}>จัดการ</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / Edit Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={styles.modalTitle}>
              {editTarget ? '✏️ แก้ไข Tournament' : '➕ สร้าง Tournament'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div className="input-group">
                <label className="input-label">ชื่อ Tournament *</label>
                <input className="input" placeholder="เช่น การแข่งขันคณิตศาสตร์"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">คำชี้แจง</label>
                <textarea className="input" placeholder="รายละเอียด กติกา วันเวลา ฯลฯ"
                  value={form.description} rows={3}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical', minHeight: 70, fontFamily: 'Noto Sans Thai, sans-serif' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">ค่าสมัคร (แต้ม)</label>
                  <input className="input" type="number" inputMode="numeric"
                    placeholder="0" value={form.entry_cost}
                    onChange={e => setForm(f => ({ ...f, entry_cost: e.target.value }))}
                    style={{ fontFamily: 'Sora', fontWeight: 700, textAlign: 'center' }} />
                </div>
                <div className="input-group">
                  <label className="input-label">จำนวนคน (-1=∞)</label>
                  <input className="input" type="number" inputMode="numeric"
                    placeholder="-1" value={form.max_participants}
                    onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))}
                    style={{ textAlign: 'center' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> กำลังบันทึก...</> : editTarget ? '💾 บันทึก' : '✨ สร้าง'}
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
  content: { padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    background: 'white', borderRadius: 14, padding: '14px 16px',
    boxShadow: '0 2px 10px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
    display: 'flex', alignItems: 'center', gap: 12,
    animation: 'fadeIn 0.3s ease',
  },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E' },
  cardDesc: { fontSize: '0.75rem', color: '#9898AD', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardTeacher: { fontSize: '0.72rem', color: '#B89EFF', marginTop: 3 },
  cardMeta: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  costChip: { fontSize: '0.72rem', fontWeight: 700, background: '#FFF9E0', color: '#8a6500', borderRadius: 8, padding: '2px 8px' },
  limitChip: { fontSize: '0.72rem', fontWeight: 700, background: '#F0FFF4', color: '#007A5A', borderRadius: 8, padding: '2px 8px' },
  statusChip: { fontSize: '0.7rem', fontWeight: 700, borderRadius: 8, padding: '2px 8px' },
  cardActions: { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' },
  editBtn: {
    width: 32, height: 32, borderRadius: 8,
    background: '#EDE5FF', border: 'none', cursor: 'pointer',
    fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  toggleBtn: { background: '#F4F4F6', border: 'none', color: '#6E6E88', fontFamily: 'Sora, sans-serif', fontWeight: 600 },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#1A1A2E' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  codeDisplay: { fontSize: '0.8rem', color: '#9898AD', marginTop: 4 },
  hofBox: {
    background: '#FFF9E0', borderRadius: 14, padding: '14px',
    border: '1px solid #F5C842', marginBottom: 16,
  },
  hofTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#8a6500', marginBottom: 10 },
  hofRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  hofMedal: { fontSize: '1.3rem', flexShrink: 0 },
  compHeader: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#6E6E88', marginBottom: 10 },
  compList: { display: 'flex', flexDirection: 'column', gap: 2 },
  compItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F4F4F6' },
  compRank: { fontFamily: 'Space Mono', fontSize: '0.75rem', color: '#9898AD', width: 24, flexShrink: 0 },
  sAvatar: (color) => ({
    width: 32, height: 32, borderRadius: '50%', background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', fontWeight: 800, color: 'white', flexShrink: 0, fontFamily: 'Sora, sans-serif',
  }),
  compInfo: { flex: 1, minWidth: 0 },
  compName: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#1A1A2E' },
  compTime: { fontSize: '0.7rem', color: '#9898AD' },
}