import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const emptyForm = { title: '', description: '', join_code: randomCode(), points_reward: 10, max_participants: -1, image_url: '' }

export default function TeacherTests() {
  const { profile } = useAuth()
  const { toast, showToast } = useToast()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [completions, setCompletions] = useState([])
  const [failed, setFailed] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => { fetchTests() }, [])

  async function fetchTests() {
    let query = supabase
      .from('tests')
      .select('*, teacher:teacher_id(nickname)')
      .order('created_at', { ascending: false })
    if (profile.role !== 'admin') query = query.eq('teacher_id', profile.id)
    const { data } = await query
    setTests(data || [])
    setLoading(false)
  }

  async function fetchCompletions(testId) {
    const [compRes, failRes] = await Promise.all([
      supabase
        .from('test_completions')
        .select('*, student:student_id(nickname, avatar_color, first_name, last_name)')
        .eq('test_id', testId)
        .order('completed_at', { ascending: false }),
      supabase
        .from('test_attempts')
        .select('*, student:student_id(nickname, avatar_color, first_name, last_name)')
        .eq('test_id', testId)
        .eq('success', false)
        .order('created_at', { ascending: false }),
    ])
    setCompletions(compRes.data || [])
    setFailed(failRes.data || [])
  }

  function openCreate() {
    setEditTarget(null)
    setForm({ ...emptyForm, join_code: randomCode() })
    setShowCreate(true)
  }

  function openEdit(test) {
    setEditTarget(test)
    setForm({
      title: test.title,
      description: test.description || '',
      join_code: test.join_code,
      points_reward: test.points_reward,
      max_participants: test.max_participants ?? -1,
      image_url: test.image_url || '',
    })
    setShowCreate(true)
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('กรุณาเลือกไฟล์รูปภาพ', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('รูปต้องไม่เกิน 5MB', 'error'); return }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('test-images')
        .upload(fileName, file, { upsert: false })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('test-images').getPublicUrl(fileName)
      setForm(f => ({ ...f, image_url: urlData.publicUrl }))
      showToast('อัปโหลดรูปสำเร็จ!', 'success')
    } catch {
      showToast('อัปโหลดรูปไม่สำเร็จ', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!form.title.trim()) { showToast('กรุณาใส่ชื่อกิจกรรม', 'error'); return }
    setSaving(true)
    try {
      if (editTarget) {
        const { error } = await supabase.from('tests').update({
          title: form.title.trim(),
          description: form.description.trim(),
          join_code: form.join_code.toUpperCase(),
          points_reward: parseInt(form.points_reward) || 10,
          max_participants: parseInt(form.max_participants) || -1,
          image_url: form.image_url || null,
        }).eq('id', editTarget.id)
        if (error) throw error
        showToast('แก้ไขกิจกรรมสำเร็จ!', 'success')
      } else {
        const { error } = await supabase.from('tests').insert({
          title: form.title.trim(),
          description: form.description.trim(),
          join_code: form.join_code.toUpperCase(),
          points_reward: parseInt(form.points_reward) || 10,
          max_participants: parseInt(form.max_participants) || -1,
          image_url: form.image_url || null,
          teacher_id: profile.id,
          is_active: true,
        })
        if (error) {
          if (error.code === '23505') { showToast('รหัสซ้ำ ลองรหัสใหม่', 'error'); return }
          throw error
        }
        showToast('สร้างกิจกรรมสำเร็จ! 🎉', 'success')
      }
      setShowCreate(false)
      setEditTarget(null)
      setForm({ ...emptyForm, join_code: randomCode() })
      fetchTests()
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setSaving(false) }
  }

  async function toggleActive(test) {
    await supabase.from('tests').update({ is_active: !test.is_active }).eq('id', test.id)
    fetchTests()
    showToast(test.is_active ? 'ปิดกิจกรรมแล้ว' : 'เปิดกิจกรรมแล้ว', 'info')
  }

  async function handleDelete(id) {
    await supabase.from('tests').delete().eq('id', id)
    setSelected(null)
    showToast('ลบกิจกรรมแล้ว', 'info')
    fetchTests()
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      <div style={styles.header}>
        <div style={styles.headerTitle}>📝 จัดการกิจกรรม</div>
        <button className="btn btn-gold btn-sm" onClick={openCreate}>+ สร้างใหม่</button>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : tests.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <span className="emoji">📝</span>
            <p>ยังไม่มีกิจกรรม<br />กด "+ สร้างใหม่" เพื่อเริ่ม</p>
          </div>
        ) : tests.map(test => (
          <TestCard
            key={test.id}
            test={test}
            showTeacher={profile.role === 'admin'}
            onToggle={() => toggleActive(test)}
            onEdit={() => openEdit(test)}
            onView={async () => { setSelected(test); await fetchCompletions(test.id) }}
          />
        ))}
      </div>

      {/* Create / Edit Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
            <div className="modal-handle" />
            <h2 style={styles.modalTitle}>
              {editTarget ? '✏️ แก้ไขกิจกรรม' : '➕ สร้างกิจกรรมใหม่'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div className="input-group">
                <label className="input-label">ชื่อกิจกรรม *</label>
                <input className="input" placeholder="เช่น แบบทดสอบบทที่ 3"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              {/* Image upload */}
              <div className="input-group">
                <label className="input-label">รูปกิจกรรม (ไม่บังคับ)</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                {form.image_url ? (
                  <div style={styles.imagePreviewWrap}>
                    <img src={form.image_url} alt="preview" style={styles.imagePreview} />
                    <button style={styles.removeImageBtn}
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}>✕ ลบรูป</button>
                  </div>
                ) : (
                  <button style={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}>
                    {uploading ? <><span className="spinner" /> กำลังอัปโหลด...</> : '📷 เลือกรูปภาพ'}
                  </button>
                )}
              </div>

              <div className="input-group">
                <label className="input-label">คำอธิบาย</label>
                <input className="input" placeholder="รายละเอียดเพิ่มเติม"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">แต้มที่ได้รับ</label>
                  <input className="input" type="number" inputMode="numeric"
                    placeholder="10" value={form.points_reward}
                    onChange={e => setForm(f => ({ ...f, points_reward: e.target.value }))}
                    style={{ fontFamily: 'Sora', fontWeight: 700, textAlign: 'center' }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">จำนวนคน (-1=∞)</label>
                  <input className="input" type="number" inputMode="numeric"
                    placeholder="-1" value={form.max_participants}
                    onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))}
                    style={{ textAlign: 'center' }}
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">รหัสเข้า</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="input"
                    value={form.join_code}
                    onChange={e => setForm(f => ({ ...f, join_code: e.target.value.toUpperCase() }))}
                    style={{ fontFamily: 'Space Mono', letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}
                    maxLength={8}
                  />
                  <button style={styles.refreshBtn}
                    onClick={() => setForm(f => ({ ...f, join_code: randomCode() }))}>🔄</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving || uploading}>
                {saving ? <><span className="spinner" /> กำลังบันทึก...</> : editTarget ? '💾 บันทึกการแก้ไข' : '✨ สร้างกิจกรรม'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Completions Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
            <div className="modal-handle" />
            <div style={styles.testDetailHeader}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={styles.modalTitle}>{selected.title}</h2>
                <div style={styles.codeDisplay}>
                  รหัส: <strong style={{ fontFamily: 'Space Mono', letterSpacing: '0.1em' }}>{selected.join_code}</strong>
                  · +{selected.points_reward} แต้ม
                  · {selected.max_participants === -1 ? 'ไม่จำกัดคน' : `จำกัด ${selected.max_participants} คน`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); openEdit(selected) }}>✏️</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>ลบ</button>
              </div>
            </div>

            {/* Correct */}
            <div style={styles.compHeader}>✅ ตอบถูก ({completions.length} คน{selected.max_participants > 0 ? ` / ${selected.max_participants}` : ''})</div>
            {completions.length === 0 ? (
              <div style={styles.emptyMini}>ยังไม่มีนักเรียนทำเสร็จ</div>
            ) : (
              <div style={styles.compList}>
                {completions.map((c, i) => (
                  <div key={c.id} style={styles.compItem}>
                    <span style={styles.compRank}>#{i + 1}</span>
                    <div style={styles.sAvatar(c.student?.avatar_color)}>
                      {c.student?.nickname?.[0]?.toUpperCase()}
                    </div>
                    <div style={styles.compInfo}>
                      <div style={styles.compName}>{c.student?.nickname}</div>
                      <div style={styles.compTime}>
                        {new Date(c.completed_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={styles.compPts}>+{c.points_earned}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Wrong */}
            <div style={{ ...styles.compHeader, color: '#C53030', marginTop: 20 }}>❌ ตอบผิด ({failed.length} คน)</div>
            {failed.length === 0 ? (
              <div style={styles.emptyMini}>ยังไม่มีคนตอบผิด</div>
            ) : (
              <div style={styles.compList}>
                {failed.map((f, i) => (
                  <div key={f.id} style={styles.compItem}>
                    <span style={styles.compRank}>#{i + 1}</span>
                    <div style={styles.sAvatar(f.student?.avatar_color)}>
                      {f.student?.nickname?.[0]?.toUpperCase()}
                    </div>
                    <div style={styles.compInfo}>
                      <div style={styles.compName}>{f.student?.nickname}</div>
                      <div style={styles.compTime}>
                        {f.student?.first_name} {f.student?.last_name}
                      </div>
                    </div>
                    <div style={styles.wrongAnswer}>
                      ตอบ: <strong>{f.answer_text || '—'}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
      <BottomNav role={profile?.role} />
    </div>
  )
}

function TestCard({ test, showTeacher, onToggle, onEdit, onView }) {
  const maxP = test.max_participants
  return (
    <div style={{ ...styles.testCard, opacity: test.is_active ? 1 : 0.6 }}>
      {test.image_url && <img src={test.image_url} alt="" style={styles.cardThumb} />}
      <div style={styles.testMain}>
        <div style={styles.testTitle}>{test.title}</div>
        {test.description && <div style={styles.testDesc}>{test.description}</div>}
        {showTeacher && test.teacher && <div style={styles.testTeacher}>👤 {test.teacher.nickname}</div>}
        <div style={styles.testMeta}>
          <span style={styles.codeChip}>{test.join_code}</span>
          <span style={styles.ptsChip}>+{test.points_reward} แต้ม</span>
          {maxP !== -1 && <span style={styles.limitChip}>👥 {maxP} คน</span>}
          <span style={{ ...styles.statusChip, background: test.is_active ? '#D0FFF4' : '#F4F4F6', color: test.is_active ? '#007A5A' : '#9898AD' }}>
            {test.is_active ? '● เปิด' : '○ ปิด'}
          </span>
        </div>
      </div>
      <div style={styles.testActions}>
        <button style={styles.editBtn} onClick={onEdit}>✏️</button>
        <button className="btn btn-sm" style={styles.toggleBtn} onClick={onToggle}>
          {test.is_active ? 'ปิด' : 'เปิด'}
        </button>
        <button className="btn btn-sm btn-secondary" onClick={onView}>ดู</button>
      </div>
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
  content: { padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 },
  testCard: {
    background: 'white', borderRadius: 14, padding: '14px 16px',
    boxShadow: '0 2px 10px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
    display: 'flex', alignItems: 'center', gap: 12,
    animation: 'fadeIn 0.3s ease',
  },
  cardThumb: {
    width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
    border: '1px solid rgba(108,58,247,0.1)',
  },
  testMain: { flex: 1, minWidth: 0 },
  testTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E' },
  testDesc: { fontSize: '0.75rem', color: '#9898AD', marginTop: 2 },
  testTeacher: { fontSize: '0.72rem', color: '#B89EFF', marginTop: 3 },
  testMeta: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  codeChip: {
    fontFamily: 'Space Mono', fontSize: '0.72rem', fontWeight: 700,
    background: '#EDE5FF', color: '#6C3AF7', borderRadius: 8, padding: '2px 8px',
    letterSpacing: '0.06em',
  },
  ptsChip: { fontSize: '0.72rem', fontWeight: 700, background: '#FFF9E0', color: '#8a6500', borderRadius: 8, padding: '2px 8px' },
  limitChip: { fontSize: '0.72rem', fontWeight: 700, background: '#F0FFF4', color: '#007A5A', borderRadius: 8, padding: '2px 8px' },
  statusChip: { fontSize: '0.7rem', fontWeight: 700, borderRadius: 8, padding: '2px 8px' },
  testActions: { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' },
  editBtn: {
    width: 32, height: 32, borderRadius: 8,
    background: '#EDE5FF', border: 'none', cursor: 'pointer',
    fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  toggleBtn: { background: '#F4F4F6', border: 'none', color: '#6E6E88', fontFamily: 'Sora, sans-serif', fontWeight: 600 },
  refreshBtn: { padding: '0 10px', borderRadius: 8, border: '2px solid #E8E8EF', background: 'white', cursor: 'pointer', fontSize: '1rem' },
  uploadBtn: {
    width: '100%', padding: '12px', borderRadius: 12,
    border: '2px dashed #C9B8F5', background: '#F8F5FF', color: '#6C3AF7',
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  imagePreviewWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  imagePreview: { width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block', borderRadius: 12 },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8,
    background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
    borderRadius: 20, padding: '5px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Noto Sans Thai, sans-serif',
  },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#1A1A2E' },
  testDetailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  codeDisplay: { fontSize: '0.8rem', color: '#9898AD', marginTop: 4 },
  compHeader: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#6E6E88', marginBottom: 10 },
  emptyMini: { textAlign: 'center', color: '#9898AD', fontSize: '0.82rem', padding: '12px 0' },
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
  compPts: { fontFamily: 'Space Mono', fontWeight: 700, fontSize: '0.9rem', color: '#00D9A3', flexShrink: 0 },
  wrongAnswer: {
    fontSize: '0.78rem', color: '#C53030', flexShrink: 0,
    background: '#FFE5E5', borderRadius: 8, padding: '4px 10px',
    fontFamily: 'Space Mono, monospace',
  },
}