import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import { AvatarSVG, DEFAULT_AVATAR } from '../../components/shared/AvatarBuilder'
import BottomNav from '../../components/shared/BottomNav'

export default function StudentCourses() {
  const { profile } = useAuth()
  const { toast, showToast } = useToast()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [classmates, setClassmates] = useState([])

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    const { data } = await supabase
      .from('course_members')
      .select('*, course:course_id(*, teacher:teacher_id(nickname))')
      .eq('student_id', profile.id)
      .order('joined_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  async function handleJoin() {
    if (!joinCode.trim()) { showToast('ใส่รหัสคอร์สก่อน', 'error'); return }
    setJoining(true)
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !course) { showToast('ไม่พบรหัสคอร์ส', 'error'); return }

      const alreadyJoined = courses.find(c => c.course_id === course.id)
      if (alreadyJoined) { showToast('เข้าคอร์สนี้ไปแล้ว', 'error'); return }

      const { error: joinError } = await supabase.from('course_members').insert({
        course_id: course.id,
        student_id: profile.id,
      })
      if (joinError) throw joinError

      showToast(`เข้าร่วม "${course.title}" สำเร็จ! 🎉`, 'success')
      setJoinCode('')
      fetchCourses()
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setJoining(false) }
  }

  async function fetchClassmates(courseId) {
    const { data } = await supabase
      .from('course_members')
      .select('*, student:student_id(*)')
      .eq('course_id', courseId)
      .order('joined_at')
    setClassmates(data || [])
  }

  async function leaveCourse(courseId) {
    if (!window.confirm('ออกจากคอร์สนี้?')) return
    await supabase.from('course_members')
      .delete()
      .eq('course_id', courseId)
      .eq('student_id', profile.id)
    setSelectedCourse(null)
    fetchCourses()
    showToast('ออกจากคอร์สแล้ว', 'info')
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      <div style={styles.header}>
        <div style={styles.headerTitle}>📚 คอร์สของฉัน</div>
        <div style={styles.pointsChip}>💰 {profile?.points || 0}</div>
      </div>

      {/* Join Code */}
      <div style={styles.joinCard}>
        <div style={styles.joinTitle}>เข้าร่วมคอร์ส</div>
        <div style={styles.joinRow}>
          <input
            className="input"
            style={{ flex: 1, fontFamily: 'Space Mono', letterSpacing: '0.1em', textTransform: 'uppercase' }}
            placeholder="รหัสคอร์สจากครู"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
          <button className="btn btn-primary" onClick={handleJoin} disabled={joining} style={{ minWidth: 80 }}>
            {joining ? <span className="spinner" /> : 'เข้าร่วม'}
          </button>
        </div>
      </div>

      {/* Courses */}
      <div style={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">📚</span>
            <p>ยังไม่ได้เข้าร่วมคอร์สไหน<br />ใส่รหัสจากครูด้านบน</p>
          </div>
        ) : courses.map(m => (
          <div key={m.id} style={styles.courseCard}
            onClick={async () => { setSelectedCourse(m.course); await fetchClassmates(m.course_id) }}>
            <div style={styles.courseIcon}>📚</div>
            <div style={styles.courseInfo}>
              <div style={styles.courseTitle}>{m.course?.title}</div>
              <div style={styles.courseMeta}>
                👤 {m.course?.teacher?.nickname}
                {m.course?.description && ` · ${m.course.description}`}
              </div>
            </div>
            <div style={styles.arrow}>›</div>
          </div>
        ))}
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="modal-overlay" onClick={() => setSelectedCourse(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85dvh' }}>
            <div className="modal-handle" />
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>{selectedCourse.title}</h2>
                <div style={styles.modalSub}>ครู: {selectedCourse.teacher?.nickname} · {classmates.length} คน</div>
              </div>
              <button
                style={styles.leaveBtn}
                onClick={() => leaveCourse(selectedCourse.id)}
              >ออก</button>
            </div>

            <div style={styles.classmateTitle}>เพื่อนร่วมคอร์ส</div>
            <div style={styles.classmateList}>
              {classmates.map((c, i) => {
                const s = c.student
                const isMe = s?.id === profile.id
                const avatarConfig = s?.avatar_config
                  ? JSON.parse(s.avatar_config)
                  : { ...DEFAULT_AVATAR, skinColor: s?.avatar_color || '#FDDBB4' }
                return (
                  <div key={c.id} style={{ ...styles.classmateRow, ...(isMe ? styles.classmateMe : {}) }}>
                    <div style={styles.cmRank}>#{i + 1}</div>
                    <div style={styles.cmAvatar}>
                      <AvatarSVG config={avatarConfig} size={36} />
                    </div>
                    <div style={styles.cmInfo}>
                      <div style={styles.cmName}>
                        {s?.nickname}
                        {isMe && <span style={styles.meBadge}> ฉัน</span>}
                      </div>
                      <div style={styles.cmMeta}>{s?.first_name} {s?.last_name}</div>
                    </div>
                    <div style={styles.cmPts}>{s?.points || 0}<span style={styles.cmPtsLabel}> แต้ม</span></div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
      <BottomNav role="student" />
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
  pointsChip: {
    background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 14px',
    color: 'white', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem',
  },
  joinCard: {
    margin: '16px', background: 'white', borderRadius: 16, padding: '16px',
    boxShadow: '0 4px 16px rgba(108,58,247,0.1)', border: '1px solid rgba(108,58,247,0.1)',
  },
  joinTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E', marginBottom: 12 },
  joinRow: { display: 'flex', gap: 10 },
  content: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  courseCard: {
    background: 'white', borderRadius: 14, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: '0 2px 10px rgba(108,58,247,0.07)',
    border: '1px solid rgba(108,58,247,0.07)',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  courseIcon: { fontSize: '1.8rem', flexShrink: 0 },
  courseInfo: { flex: 1, minWidth: 0 },
  courseTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E' },
  courseMeta: { fontSize: '0.75rem', color: '#9898AD', marginTop: 3 },
  arrow: { fontSize: '1.4rem', color: '#D0D0DC', flexShrink: 0 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#1A1A2E' },
  modalSub: { fontSize: '0.78rem', color: '#9898AD', marginTop: 4 },
  leaveBtn: {
    padding: '6px 14px', borderRadius: 10, border: 'none',
    background: '#FFE5E5', color: '#C53030',
    fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
  },
  classmateTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#6E6E88', marginBottom: 10 },
  classmateList: { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '55dvh', overflowY: 'auto' },
  classmateRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 4px', borderBottom: '1px solid #F4F4F6',
  },
  classmateMe: { background: '#F5F0FF', borderRadius: 10, padding: '10px 8px' },
  cmRank: { fontFamily: 'Space Mono', fontSize: '0.72rem', color: '#9898AD', width: 24, flexShrink: 0 },
  cmAvatar: { width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 },
  cmInfo: { flex: 1, minWidth: 0 },
  cmName: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#1A1A2E', display: 'flex', alignItems: 'center', gap: 6 },
  cmMeta: { fontSize: '0.7rem', color: '#9898AD', marginTop: 1 },
  meBadge: { fontSize: '0.65rem', background: '#6C3AF7', color: 'white', borderRadius: 8, padding: '1px 6px', fontWeight: 700 },
  cmPts: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#6C3AF7', flexShrink: 0 },
  cmPtsLabel: { fontSize: '0.62rem', fontWeight: 500, color: '#9898AD' },
}