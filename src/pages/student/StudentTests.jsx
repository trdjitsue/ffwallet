import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

export default function StudentTests() {
  const { profile, refreshProfile } = useAuth()
  const { toast, showToast } = useToast()
  const [joinCode, setJoinCode] = useState('')
  const [tests, setTests] = useState([])
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [activeTest, setActiveTest] = useState(null)

  useEffect(() => {
    fetchData()
  }, [profile?.id])

  async function fetchData() {
    const [testsRes, compRes] = await Promise.all([
      supabase.from('tests').select('*, teacher:teacher_id(nickname)').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('test_completions').select('test_id').eq('student_id', profile.id),
    ])
    setTests(testsRes.data || [])
    setCompletions((compRes.data || []).map(c => c.test_id))
    setLoading(false)
  }

  async function handleJoin() {
    if (!joinCode.trim()) { showToast('กรุณาใส่รหัส', 'error'); return }
    setJoining(true)
    try {
      const { data: test, error } = await supabase
        .from('tests')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !test) { showToast('ไม่พบรหัสกิจกรรม', 'error'); return }

      if (completions.includes(test.id)) {
        showToast('ทำกิจกรรมนี้ไปแล้ว', 'error'); return
      }

      setActiveTest(test)
      setJoinCode('')
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error')
    } finally {
      setJoining(false)
    }
  }

  async function handleComplete() {
    if (!activeTest) return
    setJoining(true)
    try {
      // Insert completion
      const { error: compError } = await supabase.from('test_completions').insert({
        test_id: activeTest.id,
        student_id: profile.id,
        points_earned: activeTest.points_reward,
      })
      if (compError && compError.code === '23505') {
        showToast('ทำกิจกรรมนี้ไปแล้ว', 'error')
        setActiveTest(null)
        return
      }
      if (compError) throw compError

      // Award points
      const { error: txError } = await supabase.from('point_transactions').insert({
        student_id: profile.id,
        points: activeTest.points_reward,
        transaction_type: 'earn',
        reason: `✅ เสร็จ: ${activeTest.title}`,
      })
      if (txError) throw txError

      showToast(`ได้รับ ${activeTest.points_reward} แต้ม! 🎉`, 'success')
      setActiveTest(null)
      await refreshProfile()
      fetchData()
    } catch (err) {
      showToast('เกิดข้อผิดพลาด', 'error')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>📝 กิจกรรม & แบบทดสอบ</div>
        <div style={styles.pointsChip}>💰 {profile?.points || 0}</div>
      </div>

      {/* Join Code Input */}
      <div style={styles.joinCard}>
        <div style={styles.joinTitle}>มีรหัสกิจกรรม?</div>
        <div style={styles.joinRow}>
          <input
            className="input"
            style={styles.joinInput}
            placeholder="ใส่รหัส เช่น ABC123"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
          <button
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={joining}
            style={{ minWidth: 80 }}
          >
            {joining ? <span className="spinner" /> : 'เข้าร่วม'}
          </button>
        </div>
      </div>

      {/* Active Tests List */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>กิจกรรมที่เปิดอยู่</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#9898AD' }}>กำลังโหลด...</div>
        ) : tests.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">📚</span>
            <p>ยังไม่มีกิจกรรม</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tests.map(test => {
              const done = completions.includes(test.id)
              return (
                <div key={test.id} style={{ ...styles.testCard, ...(done ? styles.testDone : {}) }}>
                  <div style={styles.testInfo}>
                    <div style={styles.testTitle}>{test.title}</div>
                    {test.description && <div style={styles.testDesc}>{test.description}</div>}
                    <div style={styles.testMeta}>
                      <span style={styles.testTeacher}>👤 {test.teacher?.nickname}</span>
                    </div>
                  </div>
                  <div style={styles.testRight}>
                    <div style={styles.testPoints}>+{test.points_reward}</div>
                    <div style={styles.testPointsLabel}>แต้ม</div>
                    {done ? (
                      <span style={styles.doneBadge}>✅ เสร็จแล้ว</span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveTest(test)}
                        style={{ marginTop: 4, padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        เข้าร่วม
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {activeTest && (
        <div className="modal-overlay" onClick={() => setActiveTest(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎯</div>
              <h2 style={styles.modalTitle}>{activeTest.title}</h2>
              {activeTest.description && <p style={styles.modalDesc}>{activeTest.description}</p>}
            </div>

            <div style={styles.rewardRow}>
              <span>เมื่อเสร็จจะได้รับ</span>
              <strong style={{ color: '#6C3AF7', fontSize: '1.2rem' }}>
                +{activeTest.points_reward} แต้ม 🎉
              </strong>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setActiveTest(null)}>ยกเลิก</button>
              <button
                className="btn btn-gold"
                style={{ flex: 2 }}
                onClick={handleComplete}
                disabled={joining}
              >
                {joining ? <><span className="spinner" /> กำลังบันทึก...</> : '✅ ทำเสร็จแล้ว!'}
              </button>
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
  headerTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.3rem', color: 'white',
  },
  pointsChip: {
    background: 'rgba(255,255,255,0.2)', borderRadius: 20,
    padding: '6px 14px', color: 'white',
    fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem',
    backdropFilter: 'blur(8px)',
  },
  joinCard: {
    margin: 16, background: 'white', borderRadius: 16, padding: '16px',
    boxShadow: '0 4px 16px rgba(108,58,247,0.1)',
    border: '1px solid rgba(108,58,247,0.1)',
  },
  joinTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.95rem', color: '#1A1A2E', marginBottom: 12,
  },
  joinRow: {
    display: 'flex', gap: 10,
  },
  joinInput: {
    flex: 1, fontFamily: 'Space Mono, monospace',
    letterSpacing: '0.1em', textTransform: 'uppercase',
  },
  section: { padding: '0 16px 16px' },
  sectionTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '1rem', color: '#1A1A2E', marginBottom: 12,
  },
  testCard: {
    background: 'white', borderRadius: 14, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: '0 2px 10px rgba(108,58,247,0.07)',
    border: '1px solid rgba(108,58,247,0.08)',
    transition: 'all 0.2s',
  },
  testDone: { opacity: 0.7, background: '#FAFAFA' },
  testInfo: { flex: 1, minWidth: 0 },
  testTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.9rem', color: '#1A1A2E',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  testDesc: {
    fontSize: '0.78rem', color: '#9898AD', marginTop: 2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  testMeta: { display: 'flex', gap: 10, marginTop: 6 },
  testTeacher: { fontSize: '0.72rem', color: '#9898AD' },
  testCode: {
    fontSize: '0.72rem', color: '#6C3AF7',
    fontFamily: 'Space Mono, monospace', fontWeight: 700,
  },
  testRight: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
  },
  testPoints: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.3rem', color: '#6C3AF7',
  },
  testPointsLabel: { fontSize: '0.65rem', color: '#9898AD' },
  doneBadge: {
    fontSize: '0.7rem', color: '#007A5A',
    background: '#D0FFF4', borderRadius: 10, padding: '3px 8px',
    fontWeight: 700, marginTop: 4,
  },
  modalTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.3rem', color: '#1A1A2E', marginBottom: 8,
  },
  modalDesc: { fontSize: '0.85rem', color: '#6E6E88' },
  rewardRow: {
    background: '#F5F0FF', borderRadius: 12, padding: '14px 16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '0.88rem', color: '#6E6E88',
  },
}