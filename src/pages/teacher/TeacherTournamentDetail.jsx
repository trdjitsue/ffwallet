import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

// Simple fuzzy match: every char of query appears in order within target
function fuzzyMatch(query, target) {
  if (!query) return true
  const q = query.toLowerCase().replace(/\s+/g, '')
  const t = (target || '').toLowerCase()
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

export default function TeacherTournamentDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  const [tournament, setTournament] = useState(null)
  const [exams, setExams] = useState([])
  const [members, setMembers] = useState([])
  const [scores, setScores] = useState({}) // { exam_id: { student_id: score } }
  const [loading, setLoading] = useState(true)
  const [hof, setHof] = useState(['', '', ''])
  const [savingHof, setSavingHof] = useState(false)

  // add exam form
  const [showAddExam, setShowAddExam] = useState(false)
  const [examTitle, setExamTitle] = useState('')
  const [examMax, setExamMax] = useState(100)
  const [savingExam, setSavingExam] = useState(false)

  // score entry
  const [activeExam, setActiveExam] = useState(null) // exam being scored
  const [searchName, setSearchName] = useState('')
  const [scoreInput, setScoreInput] = useState({}) // { student_id: value } draft

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const [tRes, eRes, mRes] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_exams').select('*').eq('tournament_id', id).order('created_at', { ascending: true }),
      supabase.from('tournament_members').select('joined_at, student:student_id(id, nickname, first_name, last_name, avatar_color)').eq('tournament_id', id).order('joined_at', { ascending: false }),
    ])
    setTournament(tRes.data)
    if (tRes.data) {
      const arr = Array.isArray(tRes.data.hall_of_fame) ? tRes.data.hall_of_fame : []
      setHof([arr[0] || '', arr[1] || '', arr[2] || ''])
    }
    const examList = eRes.data || []
    setExams(examList)
    setMembers((mRes.data || []).map(m => ({ ...m.student, joined_at: m.joined_at })).filter(s => s.id))
    if (examList.length) await fetchScores(examList.map(e => e.id))
    setLoading(false)
  }

  async function saveHof() {
    setSavingHof(true)
    try {
      const cleaned = hof.map(h => h.trim()).filter(Boolean)
      const { error } = await supabase.from('tournaments')
        .update({ hall_of_fame: cleaned }).eq('id', id)
      if (error) throw error
      showToast('บันทึก Hall of Fame แล้ว 🏆', 'success')
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setSavingHof(false) }
  }

  async function fetchScores(examIds) {
    const { data } = await supabase.from('tournament_scores').select('*').in('exam_id', examIds)
    const map = {}
    ;(data || []).forEach(s => {
      if (!map[s.exam_id]) map[s.exam_id] = {}
      map[s.exam_id][s.student_id] = s.score
    })
    setScores(map)
  }

  async function handleAddExam() {
    if (!examTitle.trim()) { showToast('ใส่ชื่อชุดข้อสอบ', 'error'); return }
    setSavingExam(true)
    try {
      const { error } = await supabase.from('tournament_exams').insert({
        tournament_id: id,
        title: examTitle.trim(),
        max_score: parseInt(examMax) || 100,
      })
      if (error) throw error
      showToast('เพิ่มชุดข้อสอบสำเร็จ!', 'success')
      setShowAddExam(false)
      setExamTitle('')
      setExamMax(100)
      fetchAll()
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setSavingExam(false) }
  }

  async function handleDeleteExam(examId) {
    if (!window.confirm('ลบชุดข้อสอบนี้? คะแนนทั้งหมดจะหายด้วย')) return
    await supabase.from('tournament_exams').delete().eq('id', examId)
    showToast('ลบแล้ว', 'info')
    setActiveExam(null)
    fetchAll()
  }

  async function handleDeleteTournament() {
    if (!window.confirm('ลบ Tournament นี้ทั้งหมด? ข้อมูลทุกอย่างจะหาย')) return
    await supabase.from('tournaments').delete().eq('id', id)
    showToast('ลบ Tournament แล้ว', 'info')
    navigate('/teacher/tournaments')
  }

  async function saveScore(examId, studentId, value) {
    const score = parseFloat(value)
    if (isNaN(score)) return
    const { error } = await supabase.from('tournament_scores').upsert({
      exam_id: examId,
      student_id: studentId,
      score,
    }, { onConflict: 'exam_id,student_id' })
    if (error) { showToast('บันทึกคะแนนไม่สำเร็จ', 'error'); return }
    setScores(prev => ({
      ...prev,
      [examId]: { ...(prev[examId] || {}), [studentId]: score },
    }))
    showToast('บันทึกคะแนนแล้ว ✅', 'success')
  }

  const filteredMembers = members.filter(m =>
    fuzzyMatch(searchName, m.nickname) ||
    fuzzyMatch(searchName, `${m.first_name} ${m.last_name}`)
  )

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={() => navigate('/teacher/tournaments')} style={styles.backBtn}>← กลับ</button>
          <div style={styles.headerTitle}>จัดการ Tournament</div>
          <div style={{ width: 40 }} />
        </div>
        <div style={{ textAlign: 'center', padding: 40, color: '#9898AD' }}>กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      <div style={styles.header}>
        <button onClick={() => navigate('/teacher/tournaments')} style={styles.backBtn}>← กลับ</button>
        <div style={styles.headerTitle}>{tournament?.title || 'Tournament'}</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.sectionRow}>
          <div style={styles.sectionTitle}>ชุดข้อสอบ ({exams.length})</div>
          <button className="btn btn-gold btn-sm" onClick={() => setShowAddExam(true)}>+ เพิ่มชุด</button>
        </div>

        {exams.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 20 }}>
            <span className="emoji">📄</span>
            <p>ยังไม่มีชุดข้อสอบ<br />กด "+ เพิ่มชุด" เพื่อเริ่ม</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exams.map(exam => {
              const examScores = scores[exam.id] || {}
              const scoredCount = Object.keys(examScores).length
              return (
                <div key={exam.id} style={styles.examCard}>
                  <div style={styles.examMain}>
                    <div style={styles.examTitle}>{exam.title}</div>
                    <div style={styles.examMeta}>
                      <span style={styles.maxChip}>เต็ม {exam.max_score}</span>
                      <span style={styles.scoredChip}>กรอกแล้ว {scoredCount}/{members.length} คน</span>
                    </div>
                  </div>
                  <div style={styles.examActions}>
                    <button className="btn btn-primary btn-sm" onClick={() => { setActiveExam(exam); setSearchName(''); setScoreInput({}) }}>
                      กรอกคะแนน
                    </button>
                    <button style={styles.delExamBtn} onClick={() => handleDeleteExam(exam.id)}>🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Hall of Fame */}
        <div style={styles.hofBox}>
          <div style={styles.hofTitle}>🏆 Hall of Fame (3 อันดับ)</div>
          {[0, 1, 2].map(i => (
            <div key={i} style={styles.hofRow}>
              <span style={styles.hofMedal}>{['🥇', '🥈', '🥉'][i]}</span>
              <input className="input" placeholder={`อันดับ ${i + 1}`}
                value={hof[i]}
                onChange={e => setHof(h => { const n = [...h]; n[i] = e.target.value; return n })}
                style={{ flex: 1 }} />
            </div>
          ))}
          <button className="btn btn-primary btn-full" onClick={saveHof} disabled={savingHof} style={{ marginTop: 8 }}>
            {savingHof ? <><span className="spinner" /> กำลังบันทึก...</> : '💾 บันทึก Hall of Fame'}
          </button>
        </div>

        {/* Members list */}
        <div style={styles.membersHeader}>👥 ผู้สมัคร ({members.length} คน)</div>
        {members.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">⏳</span>
            <p>ยังไม่มีผู้สมัคร</p>
          </div>
        ) : (
          <div style={styles.memberList}>
            {members.map((m, i) => (
              <div key={m.id} style={styles.memberItem}>
                <span style={styles.memberRank}>#{i + 1}</span>
                <div style={styles.sAvatar(m.avatar_color)}>{m.nickname?.[0]?.toUpperCase()}</div>
                <div style={styles.memberInfo}>
                  <div style={styles.memberName}>{m.nickname}</div>
                  <div style={styles.memberFull}>{m.first_name} {m.last_name}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={handleDeleteTournament} style={styles.deleteTournamentBtn}>
          🗑️ ลบ Tournament นี้
        </button>
      </div>

      {/* Add Exam Modal */}
      {showAddExam && (
        <div className="modal-overlay" onClick={() => setShowAddExam(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={styles.modalTitle}>➕ เพิ่มชุดข้อสอบ</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div className="input-group">
                <label className="input-label">ชื่อชุดข้อสอบ *</label>
                <input className="input" placeholder="เช่น รอบคัดเลือก, รอบชิงชนะเลิศ"
                  value={examTitle} onChange={e => setExamTitle(e.target.value)} autoFocus />
              </div>
              <div className="input-group">
                <label className="input-label">คะแนนเต็ม</label>
                <input className="input" type="number" inputMode="numeric"
                  value={examMax} onChange={e => setExamMax(e.target.value)}
                  style={{ fontFamily: 'Sora', fontWeight: 700, textAlign: 'center' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddExam(false)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleAddExam} disabled={savingExam}>
                {savingExam ? <><span className="spinner" /> กำลังบันทึก...</> : '✨ เพิ่มชุด'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Entry Modal */}
      {activeExam && (
        <div className="modal-overlay" onClick={() => setActiveExam(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
            <div className="modal-handle" />
            <h2 style={styles.modalTitle}>{activeExam.title}</h2>
            <div style={styles.codeDisplay}>คะแนนเต็ม {activeExam.max_score} · ผู้สมัคร {members.length} คน</div>

            <div className="input-group" style={{ marginTop: 14 }}>
              <input className="input" placeholder="🔍 พิมพ์ชื่อค้นหา..."
                value={searchName} onChange={e => setSearchName(e.target.value)} />
            </div>

            {filteredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9898AD', fontSize: '0.85rem', padding: '20px 0' }}>
                {members.length === 0 ? 'ยังไม่มีผู้สมัคร' : `ไม่พบ "${searchName}"`}
              </div>
            ) : (
              <div style={styles.scoreList}>
                {filteredMembers.map(m => {
                  const saved = scores[activeExam.id]?.[m.id]
                  const draft = scoreInput[m.id] !== undefined ? scoreInput[m.id] : (saved !== undefined ? String(saved) : '')
                  return (
                    <div key={m.id} style={styles.scoreRow}>
                      <div style={styles.sAvatar(m.avatar_color)}>{m.nickname?.[0]?.toUpperCase()}</div>
                      <div style={styles.scoreInfo}>
                        <div style={styles.scoreName}>{m.nickname}</div>
                        <div style={styles.scoreFull}>{m.first_name} {m.last_name}</div>
                      </div>
                      <input
                        className="input"
                        type="number"
                        inputMode="decimal"
                        placeholder="-"
                        value={draft}
                        onChange={e => setScoreInput(prev => ({ ...prev, [m.id]: e.target.value }))}
                        style={styles.scoreField}
                      />
                      <span style={styles.outOf}>/{activeExam.max_score}</span>
                      <button className="btn btn-primary btn-sm" style={{ flexShrink: 0, padding: '6px 10px' }}
                        onClick={() => saveScore(activeExam.id, m.id, draft)}>
                        บันทึก
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <button className="btn btn-secondary btn-full" style={{ marginTop: 16 }} onClick={() => setActiveExam(null)}>ปิด</button>
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
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: 'white', flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  content: { padding: '16px' },
  sectionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#1A1A2E' },
  examCard: {
    background: 'white', borderRadius: 14, padding: '14px 16px',
    boxShadow: '0 2px 10px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  examMain: { flex: 1, minWidth: 0 },
  examTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: '#1A1A2E' },
  examMeta: { display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  maxChip: { fontSize: '0.72rem', fontWeight: 700, background: '#FFF9E0', color: '#8a6500', borderRadius: 8, padding: '2px 8px' },
  scoredChip: { fontSize: '0.72rem', fontWeight: 700, background: '#EDE5FF', color: '#6C3AF7', borderRadius: 8, padding: '2px 8px' },
  examActions: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  delExamBtn: { width: 34, height: 34, borderRadius: 8, background: '#FFE5E5', border: 'none', cursor: 'pointer', fontSize: '0.9rem' },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#1A1A2E' },
  codeDisplay: { fontSize: '0.8rem', color: '#9898AD', marginTop: 4 },
  scoreList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 },
  scoreRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 0', borderBottom: '1px solid #F4F4F6',
  },
  sAvatar: (color) => ({
    width: 36, height: 36, borderRadius: '50%', background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.9rem', fontWeight: 800, color: 'white', flexShrink: 0, fontFamily: 'Sora, sans-serif',
  }),
  scoreInfo: { flex: 1, minWidth: 0 },
  scoreName: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  scoreFull: { fontSize: '0.7rem', color: '#9898AD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  scoreField: { width: 56, textAlign: 'center', padding: '8px 4px', fontFamily: 'Sora', fontWeight: 700, flexShrink: 0 },
  outOf: { fontSize: '0.78rem', color: '#9898AD', flexShrink: 0 },
  hofBox: {
    background: '#FFF9E0', borderRadius: 14, padding: '14px',
    border: '1px solid #F5C842', marginTop: 20,
  },
  hofTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#8a6500', marginBottom: 10 },
  hofRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  hofMedal: { fontSize: '1.3rem', flexShrink: 0 },
  membersHeader: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: '#1A1A2E', margin: '20px 0 10px' },
  memberList: { background: 'white', borderRadius: 14, border: '1px solid rgba(108,58,247,0.08)', boxShadow: '0 2px 10px rgba(108,58,247,0.06)', overflow: 'hidden' },
  memberItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #F4F4F6' },
  memberRank: { fontFamily: 'Space Mono', fontSize: '0.75rem', color: '#9898AD', width: 24, flexShrink: 0 },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#1A1A2E' },
  memberFull: { fontSize: '0.72rem', color: '#9898AD' },
  deleteTournamentBtn: {
    width: '100%', marginTop: 24, padding: '12px', borderRadius: 12,
    background: '#FFE5E5', color: '#C53030', border: 'none', cursor: 'pointer',
    fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem',
  },
}