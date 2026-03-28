import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

export default function StudentTests() {
  const { profile, refreshProfile } = useAuth()
  const { toast, showToast } = useToast()
  const [joinCode, setJoinCode] = useState('')
  const [tests, setTests] = useState([])
  const [completions, setCompletions] = useState([]) // test_ids student completed
  const [completionCounts, setCompletionCounts] = useState({}) // { test_id: count }
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [activeTest, setActiveTest] = useState(null)

  useEffect(() => {
    fetchData()

    // Realtime: update counts when anyone completes a test
    const channel = supabase
      .channel('test-completions-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'test_completions',
      }, () => {
        fetchCounts()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile?.id])

  async function fetchData() {
    const [testsRes, myCompRes] = await Promise.all([
      supabase
        .from('tests')
        .select('*, teacher:teacher_id(nickname)')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('test_completions')
        .select('test_id')
        .eq('student_id', profile.id),
    ])
    setTests(testsRes.data || [])
    setCompletions((myCompRes.data || []).map(c => c.test_id))
    setLoading(false)

    // fetch counts after we have test ids
    if (testsRes.data?.length) fetchCounts(testsRes.data.map(t => t.id))
  }

  async function fetchCounts(testIds) {
    const ids = testIds || tests.map(t => t.id)
    if (!ids.length) return
    const { data } = await supabase
      .from('test_completions')
      .select('test_id')
      .in('test_id', ids)
    const counts = {}
    ;(data || []).forEach(c => {
      counts[c.test_id] = (counts[c.test_id] || 0) + 1
    })
    setCompletionCounts(counts)
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
      if (completions.includes(test.id)) { showToast('ทำกิจกรรมนี้ไปแล้ว', 'error'); return }

      // Check max_participants
      const count = completionCounts[test.id] || 0
      if (test.max_participants !== -1 && count >= test.max_participants) {
        showToast('กิจกรรมนี้เต็มแล้ว', 'error'); return
      }

      setActiveTest(test)
      setJoinCode('')
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setJoining(false) }
  }

  async function handleComplete() {
    if (!activeTest) return
    if (joinCode.trim().toUpperCase() !== activeTest.join_code) {
      showToast('รหัสไม่ถูกต้อง ❌', 'error'); return
    }

    // Double check max_participants
    const count = completionCounts[activeTest.id] || 0
    if (activeTest.max_participants !== -1 && count >= activeTest.max_participants) {
      showToast('กิจกรรมนี้เต็มแล้ว 😢', 'error')
      setActiveTest(null); setJoinCode(''); return
    }

    setJoining(true)
    try {
      const { error: compError } = await supabase.from('test_completions').insert({
        test_id: activeTest.id,
        student_id: profile.id,
        points_earned: activeTest.points_reward,
      })
      if (compError && compError.code === '23505') {
        showToast('ทำกิจกรรมนี้ไปแล้ว', 'error')
        setActiveTest(null); setJoinCode(''); return
      }
      if (compError) throw compError

      const { error: txError } = await supabase.from('point_transactions').insert({
        student_id: profile.id,
        points: activeTest.points_reward,
        transaction_type: 'earn',
        reason: `✅ เสร็จ: ${activeTest.title}`,
      })
      if (txError) throw txError

      showToast(`ได้รับ ${activeTest.points_reward} แต้ม! 🎉`, 'success')
      setActiveTest(null)
      setJoinCode('')
      await refreshProfile()
      fetchData()
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setJoining(false) }
  }

  function getSlotsLeft(test) {
    if (test.max_participants === -1 || test.max_participants == null) return null
    const count = completionCounts[test.id] || 0
    return test.max_participants - count
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

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
            style={{ ...styles.joinInput, flex: 1 }}
            placeholder="ใส่รหัส เช่น ABC123"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
          <button className="btn btn-primary" onClick={handleJoin} disabled={joining} style={{ minWidth: 80 }}>
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
              const slotsLeft = getSlotsLeft(test)
              const isFull = slotsLeft !== null && slotsLeft <= 0
              const count = completionCounts[test.id] || 0

              return (
                <div key={test.id} style={{
                  ...styles.testCard,
                  ...(done || isFull ? styles.testDone : {}),
                }}>
                  <div style={styles.testInfo}>
                    <div style={styles.testTitle}>{test.title}</div>
                    {test.description && <div style={styles.testDesc}>{test.description}</div>}
                    <div style={styles.testMeta}>
                      <span style={styles.testTeacher}>👤 {test.teacher?.nickname}</span>
                      {/* Realtime slot display */}
                      {test.max_participants !== -1 && test.max_participants != null && (
                        <span style={{
                          ...styles.slotChip,
                          background: isFull ? '#FFE5E5' : slotsLeft <= 3 ? '#FFF9E0' : '#D0FFF4',
                          color: isFull ? '#C53030' : slotsLeft <= 3 ? '#8a6500' : '#007A5A',
                        }}>
                          {isFull ? '🔴 เต็มแล้ว' : `🟢 เหลือ ${slotsLeft} ที่`}
                        </span>
                      )}
                    </div>
                    {/* Progress bar for limited tests */}
                    {test.max_participants !== -1 && test.max_participants != null && (
                      <div style={styles.progressBar}>
                        <div style={{
                          ...styles.progressFill,
                          width: `${Math.min((count / test.max_participants) * 100, 100)}%`,
                          background: isFull ? '#FF6B6B' : slotsLeft <= 3 ? '#F5C842' : '#00D9A3',
                        }} />
                      </div>
                    )}
                  </div>
                  <div style={styles.testRight}>
                    <div style={styles.testPoints}>+{test.points_reward}</div>
                    <div style={styles.testPointsLabel}>แต้ม</div>
                    {done ? (
                      <span style={styles.doneBadge}>✅ เสร็จแล้ว</span>
                    ) : isFull ? (
                      <span style={styles.fullBadge}>🔴 เต็ม</span>
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

      {/* Confirm Modal with code input */}
      {activeTest && (
        <div className="modal-overlay" onClick={() => { setActiveTest(null); setJoinCode('') }}>
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

            {activeTest.max_participants !== -1 && activeTest.max_participants != null && (
              <div style={{ ...styles.rewardRow, marginTop: 6 }}>
                <span>ที่เหลือ</span>
                <strong style={{ color: getSlotsLeft(activeTest) <= 0 ? '#FF6B6B' : '#00D9A3' }}>
                  {getSlotsLeft(activeTest)} / {activeTest.max_participants} ที่
                </strong>
              </div>
            )}

            <div className="input-group" style={{ marginTop: 16 }}>
              <label className="input-label">กรอกรหัสกิจกรรม</label>
              <input
                className="input"
                placeholder="รหัสจากครู"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                style={{ fontFamily: 'Space Mono, monospace', letterSpacing: '0.15em', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => { setActiveTest(null); setJoinCode('') }}>ยกเลิก</button>
              <button className="btn btn-gold" style={{ flex: 2 }}
                onClick={handleComplete}
                disabled={joining || !joinCode.trim()}>
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
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white' },
  pointsChip: {
    background: 'rgba(255,255,255,0.2)', borderRadius: 20,
    padding: '6px 14px', color: 'white',
    fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem',
    backdropFilter: 'blur(8px)',
  },
  joinCard: {
    margin: 16, background: 'white', borderRadius: 16, padding: '16px',
    boxShadow: '0 4px 16px rgba(108,58,247,0.1)', border: '1px solid rgba(108,58,247,0.1)',
  },
  joinTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E', marginBottom: 12 },
  joinRow: { display: 'flex', gap: 10 },
  joinInput: { fontFamily: 'Space Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' },
  section: { padding: '0 16px 16px' },
  sectionTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#1A1A2E', marginBottom: 12 },
  testCard: {
    background: 'white', borderRadius: 14, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: '0 2px 10px rgba(108,58,247,0.07)',
    border: '1px solid rgba(108,58,247,0.08)',
    transition: 'all 0.2s',
  },
  testDone: { opacity: 0.7, background: '#FAFAFA' },
  testInfo: { flex: 1, minWidth: 0 },
  testTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E' },
  testDesc: { fontSize: '0.78rem', color: '#9898AD', marginTop: 2 },
  testMeta: { display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' },
  testTeacher: { fontSize: '0.72rem', color: '#9898AD' },
  slotChip: {
    fontSize: '0.72rem', fontWeight: 700, borderRadius: 20,
    padding: '2px 8px',
  },
  progressBar: {
    height: 4, background: '#F4F4F6', borderRadius: 99,
    overflow: 'hidden', marginTop: 8,
  },
  progressFill: {
    height: '100%', borderRadius: 99,
    transition: 'width 0.5s ease',
  },
  testRight: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
  testPoints: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#6C3AF7' },
  testPointsLabel: { fontSize: '0.65rem', color: '#9898AD' },
  doneBadge: { fontSize: '0.7rem', color: '#007A5A', background: '#D0FFF4', borderRadius: 10, padding: '3px 8px', fontWeight: 700, marginTop: 4 },
  fullBadge: { fontSize: '0.7rem', color: '#C53030', background: '#FFE5E5', borderRadius: 10, padding: '3px 8px', fontWeight: 700, marginTop: 4 },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#1A1A2E', marginBottom: 8 },
  modalDesc: { fontSize: '0.85rem', color: '#6E6E88' },
  rewardRow: {
    background: '#F5F0FF', borderRadius: 12, padding: '12px 16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '0.88rem', color: '#6E6E88',
  },
}