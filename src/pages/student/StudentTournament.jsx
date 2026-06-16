import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

export default function StudentTournament() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [tournaments, setTournaments] = useState([])
  const [counts, setCounts] = useState({})
  const [myJoins, setMyJoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [joining, setJoining] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [myScores, setMyScores] = useState([])
  const [scoresLoading, setScoresLoading] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [tRes, mRes] = await Promise.all([
      supabase.from('tournaments').select('*, teacher:teacher_id(nickname)').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('tournament_members').select('tournament_id').eq('student_id', profile.id),
    ])
    const list = tRes.data || []
    setTournaments(list)
    setMyJoins((mRes.data || []).map(m => m.tournament_id))
    if (list.length) await fetchCounts(list.map(t => t.id))
    setLoading(false)
  }

  async function fetchCounts(ids) {
    const { data } = await supabase.from('tournament_members').select('tournament_id').in('tournament_id', ids)
    const c = {}
    ;(data || []).forEach(m => { c[m.tournament_id] = (c[m.tournament_id] || 0) + 1 })
    ids.forEach(id => { if (!c[id]) c[id] = 0 })
    setCounts(c)
  }

  async function openTournament(t) {
    setSelected(t)
    setMyScores([])
    if (myJoins.includes(t.id)) {
      setScoresLoading(true)
      const { data: exams } = await supabase
        .from('tournament_exams')
        .select('*')
        .eq('tournament_id', t.id)
        .eq('published', true)
        .order('created_at', { ascending: true })
      if (exams && exams.length) {
        const { data: scoreRows } = await supabase
          .from('tournament_scores')
          .select('exam_id, score')
          .eq('student_id', profile.id)
          .in('exam_id', exams.map(e => e.id))
        const scoreMap = {}
        ;(scoreRows || []).forEach(s => { scoreMap[s.exam_id] = s.score })
        setMyScores(exams.map(e => ({
          title: e.title,
          max_score: e.max_score,
          score: scoreMap[e.id],
        })))
      }
      setScoresLoading(false)
    }
  }

  async function handleJoin() {
    if (!selected) return
    if (myJoins.includes(selected.id)) { showToast('สมัครไปแล้ว', 'error'); return }
    if (profile.points < selected.entry_cost) { showToast('แต้มไม่พอ 😢', 'error'); return }
    const cnt = counts[selected.id] || 0
    if (selected.max_participants !== -1 && cnt >= selected.max_participants) { showToast('เต็มแล้ว 😢', 'error'); return }

    setJoining(true)
    try {
      const { error: joinErr } = await supabase.from('tournament_members').insert({
        tournament_id: selected.id,
        student_id: profile.id,
      })
      if (joinErr) {
        if (joinErr.code === '23505') { showToast('สมัครไปแล้ว', 'error'); return }
        throw joinErr
      }
      if (selected.entry_cost > 0) {
        const { error: txErr } = await supabase.from('point_transactions').insert({
          student_id: profile.id,
          points: selected.entry_cost,
          transaction_type: 'spend',
          reason: `ค่าสมัคร: ${selected.title}`,
        })
        if (txErr) throw txErr
      }
      setCelebrate(true)
      setTimeout(() => setCelebrate(false), 2500)
      showToast(`สมัคร "${selected.title}" สำเร็จ! 🎉`, 'success')
      setSelected(null)
      await refreshProfile()
      fetchData()
    } catch { showToast('เกิดข้อผิดพลาด', 'error') }
    finally { setJoining(false) }
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />
      <style>{KEYFRAMES}</style>

      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />
      <div style={styles.starfield}>
        {STARS.map((s, i) => (
          <div key={i} style={{
            ...styles.star,
            left: s.left, top: s.top, width: s.size, height: s.size,
            animationDelay: s.delay, animationDuration: s.dur,
          }} />
        ))}
      </div>

      {celebrate && (
        <div style={styles.confettiWrap}>
          {CONFETTI.map((c, i) => (
            <div key={i} style={{
              ...styles.confetti, left: c.left, background: c.color,
              animationDelay: c.delay, animationDuration: c.dur,
              width: c.size, height: c.size,
              borderRadius: c.round ? '50%' : 2,
            }} />
          ))}
        </div>
      )}

      <div style={styles.header}>
        <button onClick={() => navigate('/student')} style={styles.backBtn}>← กลับ</button>
        <div style={styles.headerTitle}>FF Tournament</div>
        <div style={styles.pointsChip}>💰 {profile?.points || 0}</div>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.6)' }}>กำลังโหลด...</div>
        ) : tournaments.length === 0 ? (
          <div style={styles.emptyWrap}>
            <div style={styles.emptyTrophy}>🏆</div>
            <div style={styles.emptyTitle}>ยังไม่มี Tournament</div>
            <div style={styles.emptyDesc}>รอติดตามเร็วๆ นี้!</div>
          </div>
        ) : tournaments.map((t, idx) => {
          const cnt = counts[t.id] || 0
          const joined = myJoins.includes(t.id)
          const isFull = t.max_participants !== -1 && cnt >= t.max_participants
          const pct = t.max_participants !== -1 ? Math.min((cnt / t.max_participants) * 100, 100) : 0
          return (
            <button key={t.id} style={{ ...styles.card, animationDelay: `${idx * 0.08}s` }} onClick={() => openTournament(t)}>
              <div style={styles.cardShine} />
              <div style={styles.cardMedal}>
                <div style={styles.cardMedalGlow} />
                🏆
              </div>
              <div style={styles.cardInfo}>
                <div style={styles.cardTitle}>{t.title}</div>
                <div style={styles.cardMeta}>
                  <span style={styles.costChip}>💰 {t.entry_cost}</span>
                  <span style={styles.cntChip}>👥 {cnt}{t.max_participants !== -1 ? `/${t.max_participants}` : ''}</span>
                </div>
                {t.max_participants !== -1 && (
                  <div style={styles.miniBar}>
                    <div style={{ ...styles.miniFill, width: `${pct}%`, background: isFull ? '#FF6B6B' : '#F5C842' }} />
                  </div>
                )}
              </div>
              {joined ? <span style={styles.joinedBadge}>✅</span>
                : isFull ? <span style={styles.fullBadge}>เต็ม</span>
                : <span style={styles.arrow}>›</span>}
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90dvh', overflowY: 'auto', position: 'relative' }}>
            <div className="modal-handle" />

            <div style={styles.modalHero}>
              <div style={styles.modalTrophyGlow} />
              <div style={styles.modalTrophy}>🏆</div>
              <h2 style={styles.modalTitle}>{selected.title}</h2>
            </div>

            {selected.description && (
              <div style={styles.descBox}>{selected.description}</div>
            )}

            <div style={styles.infoCard}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>💰 ค่าสมัคร</span>
                <span style={styles.infoVal}>{selected.entry_cost} แต้ม</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>👥 ผู้สมัครตอนนี้</span>
                <span style={styles.infoVal}>{counts[selected.id] || 0}{selected.max_participants !== -1 ? ` / ${selected.max_participants}` : ''} คน</span>
              </div>
              <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                <span style={styles.infoLabel}>✨ แต้มของคุณ</span>
                <span style={{ ...styles.infoVal, color: profile?.points >= selected.entry_cost ? '#00A36C' : '#FF6B6B' }}>{profile?.points} แต้ม</span>
              </div>
            </div>

            {/* My Scores - shown only if joined */}
            {myJoins.includes(selected.id) && (
              <div style={styles.scoreBox}>
                <div style={styles.scoreBoxTitle}>📊 คะแนนของฉัน</div>
                {scoresLoading ? (
                  <div style={{ textAlign: 'center', padding: 16, color: '#9898AD', fontSize: '0.82rem' }}>กำลังโหลด...</div>
                ) : myScores.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, color: '#9898AD', fontSize: '0.82rem' }}>ยังไม่มีชุดข้อสอบ</div>
                ) : (
                  myScores.map((s, i) => (
                    <div key={i} style={styles.scoreItem}>
                      <span style={styles.scoreItemTitle}>{s.title}</span>
                      {s.score !== undefined && s.score !== null ? (
                        <span style={styles.scoreItemVal}>{s.score} <span style={styles.scoreItemMax}>/ {s.max_score}</span></span>
                      ) : (
                        <span style={styles.scoreItemPending}>รอคะแนน</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {Array.isArray(selected.hall_of_fame) && selected.hall_of_fame.length > 0 && (
              <div style={styles.hofBox}>
                <div style={styles.hofShine} />
                <div style={styles.hofTitle}>🏆 Hall of Fame</div>
                {selected.hall_of_fame.map((name, i) => (
                  <div key={i} style={{ ...styles.hofRow, ...(i === 0 ? styles.hofRowGold : {}) }}>
                    <span style={styles.hofMedal}>{['🥇', '🥈', '🥉'][i] || '🏅'}</span>
                    <span style={styles.hofName}>{name}</span>
                    {i === 0 && <span style={styles.hofCrown}>👑</span>}
                  </div>
                ))}
              </div>
            )}

            {(() => {
              const joined = myJoins.includes(selected.id)
              const cnt = counts[selected.id] || 0
              const isFull = selected.max_participants !== -1 && cnt >= selected.max_participants
              const cantAfford = profile?.points < selected.entry_cost
              return (
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelected(null)}>ปิด</button>
                  {joined ? (
                    <button className="btn btn-primary" style={{ flex: 2 }} disabled>✅ สมัครแล้ว</button>
                  ) : (
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleJoin}
                      disabled={joining || isFull || cantAfford}>
                      {joining ? <><span className="spinner" /> กำลังสมัคร...</>
                        : isFull ? 'เต็มแล้ว'
                        : cantAfford ? 'แต้มไม่พอ'
                        : `✨ สมัคร (${selected.entry_cost} แต้ม)`}
                    </button>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
      <BottomNav role="student" />
    </div>
  )
}

const STARS = Array.from({ length: 18 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 60}%`,
  size: `${2 + Math.random() * 3}px`,
  delay: `${Math.random() * 3}s`,
  dur: `${1.5 + Math.random() * 2}s`,
}))

const CONFETTI_COLORS = ['#F5C842', '#FF6B6B', '#00D9A3', '#6C3AF7', '#FF9EB5', '#7DD8F5']
const CONFETTI = Array.from({ length: 40 }, (_, i) => ({
  left: `${Math.random() * 100}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: `${Math.random() * 0.6}s`,
  dur: `${1.8 + Math.random() * 1.2}s`,
  size: `${6 + Math.random() * 6}px`,
  round: Math.random() > 0.5,
}))

const KEYFRAMES = `
@keyframes ttwinkle { 0%,100%{opacity:0.15;transform:scale(0.7)} 50%{opacity:1;transform:scale(1)} }
@keyframes theroFloat { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-10px) rotate(3deg)} }
@keyframes tglowPulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.15)} }
@keyframes tcardIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes tconfettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(120vh) rotate(720deg);opacity:0} }
@keyframes tbgDrift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,20px)} }
@keyframes tshine { 0%{transform:translateX(-120%)} 60%,100%{transform:translateX(220%)} }
`

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'linear-gradient(165deg, #2D0A6E 0%, #4519C9 45%, #6C3AF7 100%)',
    position: 'relative', overflow: 'hidden',
  },
  bgGlow1: {
    position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,200,66,0.25) 0%, transparent 70%)',
    animation: 'tbgDrift 8s ease-in-out infinite', pointerEvents: 'none',
  },
  bgGlow2: {
    position: 'absolute', bottom: 40, left: -80, width: 240, height: 240, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(125,216,245,0.2) 0%, transparent 70%)',
    animation: 'tbgDrift 10s ease-in-out infinite reverse', pointerEvents: 'none',
  },
  starfield: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  star: {
    position: 'absolute', borderRadius: '50%', background: 'white',
    animation: 'ttwinkle ease-in-out infinite',
  },
  confettiWrap: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'hidden' },
  confetti: { position: 'absolute', top: -20, animation: 'tconfettiFall linear forwards' },
  header: {
    padding: '52px 16px 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    position: 'relative', zIndex: 10,
  },
  backBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', flexShrink: 0,
  },
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'white', flex: 1, textAlign: 'center', textShadow: '0 2px 12px rgba(0,0,0,0.3)' },
  pointsChip: {
    background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 14px', color: 'white',
    fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.25)',
  },
  content: { padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 10 },
  emptyWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 12 },
  emptyTrophy: { fontSize: '5rem', animation: 'theroFloat 3s ease infinite', filter: 'drop-shadow(0 0 32px rgba(245,200,66,0.6))' },
  emptyTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white' },
  emptyDesc: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)' },
  card: {
    position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.22)', borderRadius: 20,
    padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
    cursor: 'pointer', textAlign: 'left', width: '100%',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    animation: 'tcardIn 0.5s ease backwards',
  },
  cardShine: {
    position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
    background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.25), transparent)',
    animation: 'tshine 4s ease-in-out infinite', pointerEvents: 'none',
  },
  cardMedal: { position: 'relative', fontSize: '2.2rem', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(245,200,66,0.4))' },
  cardMedalGlow: {
    position: 'absolute', inset: -8, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,200,66,0.35) 0%, transparent 70%)',
    animation: 'tglowPulse 2.5s ease-in-out infinite',
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'white', textShadow: '0 1px 6px rgba(0,0,0,0.2)' },
  cardMeta: { display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  costChip: { fontSize: '0.72rem', fontWeight: 700, background: 'rgba(245,200,66,0.28)', color: '#FFE9A8', borderRadius: 8, padding: '2px 8px' },
  cntChip: { fontSize: '0.72rem', fontWeight: 700, background: 'rgba(255,255,255,0.18)', color: 'white', borderRadius: 8, padding: '2px 8px' },
  miniBar: { height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden', marginTop: 8 },
  miniFill: { height: '100%', borderRadius: 99, transition: 'width 0.5s ease' },
  joinedBadge: { fontSize: '1rem', flexShrink: 0 },
  fullBadge: { fontSize: '0.72rem', fontWeight: 700, color: '#FF9EB5', background: 'rgba(255,107,107,0.25)', borderRadius: 10, padding: '4px 10px', flexShrink: 0 },
  arrow: { fontSize: '1.6rem', color: 'rgba(255,255,255,0.6)', flexShrink: 0 },
  modalHero: { position: 'relative', textAlign: 'center', marginBottom: 16, paddingTop: 4 },
  modalTrophyGlow: {
    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
    width: 120, height: 120, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,200,66,0.35) 0%, transparent 65%)',
    animation: 'tglowPulse 3s ease-in-out infinite', pointerEvents: 'none',
  },
  modalTrophy: { fontSize: '3.2rem', position: 'relative', zIndex: 2, animation: 'theroFloat 3.5s ease-in-out infinite', filter: 'drop-shadow(0 6px 16px rgba(245,200,66,0.45))' },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#1A1A2E', marginTop: 8, position: 'relative', zIndex: 2 },
  descBox: {
    background: '#F5F0FF', borderRadius: 12, padding: '12px 14px',
    fontSize: '0.85rem', color: '#4A4A62', lineHeight: 1.6, marginBottom: 14,
    whiteSpace: 'pre-wrap',
  },
  infoCard: {
    background: 'white', borderRadius: 14, padding: '4px 14px',
    border: '1px solid rgba(108,58,247,0.12)', boxShadow: '0 2px 10px rgba(108,58,247,0.06)',
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F4F4F6' },
  infoLabel: { fontSize: '0.88rem', color: '#6E6E88' },
  infoVal: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E' },
  scoreBox: {
    background: 'linear-gradient(135deg, #EDF7FF 0%, #E0F0FF 100%)',
    borderRadius: 14, padding: '14px', border: '1.5px solid #7DD8F5', marginTop: 16,
  },
  scoreBoxTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#0d6ea0', marginBottom: 10 },
  scoreItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(125,216,245,0.3)' },
  scoreItemTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.88rem', color: '#1A1A2E' },
  scoreItemVal: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#0d6ea0' },
  scoreItemMax: { fontWeight: 600, fontSize: '0.8rem', color: '#9898AD' },
  scoreItemPending: { fontSize: '0.78rem', color: '#9898AD', fontStyle: 'italic' },
  hofBox: {
    position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, #FFF9E0 0%, #FFF3C4 100%)',
    borderRadius: 14, padding: '14px', border: '1.5px solid #F5C842', marginTop: 16,
    boxShadow: '0 4px 16px rgba(245,200,66,0.25)',
  },
  hofShine: {
    position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
    background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.5), transparent)',
    animation: 'tshine 5s ease-in-out infinite', pointerEvents: 'none',
  },
  hofTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: '#8a6500', marginBottom: 10, position: 'relative', zIndex: 2 },
  hofRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', position: 'relative', zIndex: 2 },
  hofRowGold: {
    background: 'rgba(245,200,66,0.18)', borderRadius: 10, padding: '7px 10px', margin: '0 -4px',
  },
  hofMedal: { fontSize: '1.4rem' },
  hofName: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E', flex: 1 },
  hofCrown: { fontSize: '1.1rem' },
}