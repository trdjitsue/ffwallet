import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'
import { AvatarSVG, DEFAULT_AVATAR } from '../../components/shared/AvatarBuilder'

function randomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

export default function TeacherCourses() {
  const { profile } = useAuth()
  const { toast, showToast } = useToast()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', join_code: randomCode() })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    let query = supabase
      .from('courses')
      .select('*, members:course_members(count)')
      .order('created_at', { ascending: false })

    if (profile.role !== 'admin') {
      query = query.eq('teacher_id', profile.id)
    }

    const { data } = await query
    setCourses(data || [])
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.title.trim()) { showToast('ใส่ชื่อคอร์ส', 'error'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('courses').insert({
        title: form.title.trim(),
        description: form.description.trim(),
        join_code: form.join_code.toUpperCase(),
        teacher_id: profile.id,
      })
      if (error) {
        if (error.code === '23505') { showToast('รหัสซ้ำ ลองใหม่', 'error'); return }
        throw error
      }
      showToast('สร้างคอร์สสำเร็จ! 🎉', 'success')
      setShowCreate(false)
      setForm({ title: '', description: '', join_code: randomCode() })
      fetchCourses()
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setSaving(false) }
  }

  async function toggleCourse(course) {
    await supabase.from('courses').update({ is_active: !course.is_active }).eq('id', course.id)
    fetchCourses()
    showToast(course.is_active ? 'ปิดคอร์สแล้ว' : 'เปิดคอร์สแล้ว', 'info')
  }

  async function deleteCourse(id) {
    if (!window.confirm('ลบคอร์สนี้?')) return
    await supabase.from('courses').delete().eq('id', id)
    fetchCourses()
    showToast('ลบคอร์สแล้ว', 'info')
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />
      <div style={styles.header}>
        <div style={styles.headerTitle}>📚 คอร์สของฉัน</div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowCreate(true)}>+ สร้างคอร์ส</button>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : courses.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <span className="emoji">📚</span>
            <p>ยังไม่มีคอร์ส<br />กด "+ สร้างคอร์ส" เพื่อเริ่ม</p>
          </div>
        ) : courses.map(course => (
          <div key={course.id} style={{ ...styles.courseCard, opacity: course.is_active ? 1 : 0.6 }}
            onClick={() => navigate(`/teacher/courses/${course.id}`)}>
            <div style={styles.courseIcon}>📚</div>
            <div style={styles.courseInfo}>
              <div style={styles.courseTitle}>{course.title}</div>
              {course.description && <div style={styles.courseDesc}>{course.description}</div>}
              <div style={styles.courseMeta}>
                <span style={styles.codeChip}>{course.join_code}</span>
                <span style={styles.memberChip}>👥 {course.members?.[0]?.count || 0} คน</span>
                <span style={{ ...styles.statusChip, background: course.is_active ? '#D0FFF4' : '#F4F4F6', color: course.is_active ? '#007A5A' : '#9898AD' }}>
                  {course.is_active ? '● เปิด' : '○ ปิด'}
                </span>
              </div>
            </div>
            <div style={styles.courseActions} onClick={e => e.stopPropagation()}>
              <button style={styles.actionBtn} onClick={() => toggleCourse(course)}>
                {course.is_active ? 'ปิด' : 'เปิด'}
              </button>
              <button style={styles.deleteBtn} onClick={() => deleteCourse(course.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={styles.modalTitle}>📚 สร้างคอร์สใหม่</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div className="input-group">
                <label className="input-label">ชื่อคอร์ส *</label>
                <input className="input" placeholder="เช่น คณิตศาสตร์ ม.3/1"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">คำอธิบาย</label>
                <input className="input" placeholder="รายละเอียดเพิ่มเติม"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">รหัสเข้าคอร์ส</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="input"
                    value={form.join_code}
                    onChange={e => setForm(f => ({ ...f, join_code: e.target.value.toUpperCase() }))}
                    style={{ fontFamily: 'Space Mono', letterSpacing: '0.15em', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}
                    maxLength={8}
                  />
                  <button style={styles.refreshBtn} onClick={() => setForm(f => ({ ...f, join_code: randomCode() }))}>🔄</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreate} disabled={saving}>
                {saving ? <><span className="spinner" /> กำลังสร้าง...</> : '✨ สร้างคอร์ส'}
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
    padding: '52px 20px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white' },
  content: { padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 },
  courseCard: {
    background: 'white', borderRadius: 14, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: '0 2px 10px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
    cursor: 'pointer', transition: 'all 0.2s',
    animation: 'fadeIn 0.3s ease',
  },
  courseIcon: { fontSize: '1.8rem', flexShrink: 0 },
  courseInfo: { flex: 1, minWidth: 0 },
  courseTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E' },
  courseDesc: { fontSize: '0.75rem', color: '#9898AD', marginTop: 2 },
  courseMeta: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  codeChip: {
    fontFamily: 'Space Mono', fontSize: '0.72rem', fontWeight: 700,
    background: '#EDE5FF', color: '#6C3AF7', borderRadius: 8, padding: '2px 8px',
    letterSpacing: '0.06em',
  },
  memberChip: {
    fontSize: '0.72rem', fontWeight: 600,
    background: '#F0FFF4', color: '#007A5A', borderRadius: 8, padding: '2px 8px',
  },
  statusChip: { fontSize: '0.7rem', fontWeight: 700, borderRadius: 8, padding: '2px 8px' },
  courseActions: { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 },
  actionBtn: {
    padding: '5px 10px', borderRadius: 8, border: '1px solid #E8E8EF',
    background: 'white', fontFamily: 'Sora, sans-serif', fontWeight: 600,
    fontSize: '0.75rem', color: '#6E6E88', cursor: 'pointer',
  },
  deleteBtn: {
    width: 32, height: 28, borderRadius: 8, border: 'none',
    background: '#FFE5E5', cursor: 'pointer', fontSize: '0.8rem',
  },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#1A1A2E' },
  refreshBtn: {
    padding: '0 12px', borderRadius: 8, border: '2px solid #E8E8EF',
    background: 'white', cursor: 'pointer', fontSize: '1rem',
  },
}