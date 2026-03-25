import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

export default function TeacherAssignPoints() {
  const { profile } = useAuth()
  const { toast, showToast } = useToast()
  const [mode, setMode] = useState('manual') // 'manual' | 'qr'
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)

  useEffect(() => {
    if (mode === 'qr') startScanner()
    else stopScanner()
    return () => stopScanner()
  }, [mode])

  async function startScanner() {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (html5QrRef.current) { await html5QrRef.current.stop(); html5QrRef.current = null }
      const qr = new Html5Qrcode('qr-reader')
      html5QrRef.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (text) => {
          try {
            const data = JSON.parse(text)
            if (data.type === 'ff_wallet_student') {
              await stopScanner()
              setMode('manual')
              await loadStudentById(data.id)
            }
          } catch { /* not our QR */ }
        },
        () => {}
      )
    } catch (err) {
      showToast('ไม่สามารถเปิดกล้องได้', 'error')
      setMode('manual')
    }
  }

  async function stopScanner() {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop() } catch { }
      html5QrRef.current = null
    }
  }

  async function loadStudentById(id) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).eq('role', 'student').single()
    if (data) setSelected(data)
    else showToast('ไม่พบนักเรียน', 'error')
  }

  async function searchStudents(q) {
    if (!q.trim()) { setStudents([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .or(`nickname.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(10)
    setStudents(data || [])
    setSearching(false)
  }

  useEffect(() => {
    const t = setTimeout(() => searchStudents(search), 300)
    return () => clearTimeout(t)
  }, [search])

  async function handleAssign() {
    if (!selected || !points) { showToast('กรุณาใส่แต้ม', 'error'); return }
    const pts = parseInt(points)
    if (isNaN(pts) || pts <= 0) { showToast('แต้มต้องเป็นตัวเลขบวก', 'error'); return }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('point_transactions').insert({
        student_id: selected.id,
        teacher_id: profile.id,
        points: pts,
        transaction_type: 'earn',
        reason: reason.trim() || 'ครูให้แต้ม',
      })
      if (error) throw error

      showToast(`✅ ให้ ${pts} แต้มแก่ ${selected.nickname} สำเร็จ!`, 'success')
      setSelected(null)
      setPoints('')
      setReason('')
      setSearch('')
      setStudents([])
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>⭐ ให้แต้มนักเรียน</div>
      </div>

      {/* Mode Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(mode === 'manual' ? styles.tabActive : {}) }}
          onClick={() => setMode('manual')}
        >
          ✍️ ค้นหาชื่อ
        </button>
        <button
          style={{ ...styles.tab, ...(mode === 'qr' ? styles.tabActive : {}) }}
          onClick={() => setMode('qr')}
        >
          📷 สแกน QR
        </button>
      </div>

      {/* QR Scanner */}
      {mode === 'qr' && (
        <div style={styles.scannerWrap}>
          <div id="qr-reader" ref={scannerRef} style={styles.scanner} />
          <p style={styles.scanHint}>จ่อกล้องไปที่ QR Code ของนักเรียน</p>
        </div>
      )}

      {/* Manual Search */}
      {mode === 'manual' && !selected && (
        <div style={styles.searchWrap}>
          <div className="input-group">
            <label className="input-label">ค้นหานักเรียน</label>
            <input
              className="input"
              placeholder="ค้นหาด้วยชื่อเล่น, ชื่อ, username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {searching && <div style={styles.searching}>กำลังค้นหา...</div>}

          {students.length > 0 && (
            <div style={styles.resultList}>
              {students.map(s => (
                <button key={s.id} style={styles.resultItem} onClick={() => { setSelected(s); setSearch(''); setStudents([]) }}>
                  <div style={styles.sAvatar(s.avatar_color)}>{s.nickname?.[0]?.toUpperCase()}</div>
                  <div style={styles.sInfo}>
                    <div style={styles.sName}>{s.nickname} · {s.first_name} {s.last_name}</div>
                    <div style={styles.sMeta}>@{s.username} · {s.school}</div>
                    <div style={styles.sPts}>💰 {s.points} แต้ม</div>
                  </div>
                  <div style={styles.sArrow}>›</div>
                </button>
              ))}
            </div>
          )}

          {search && !searching && students.length === 0 && (
            <div style={styles.noResult}>ไม่พบนักเรียน "{search}"</div>
          )}
        </div>
      )}

      {/* Assign Form - after student selected */}
      {selected && (
        <div style={styles.assignWrap}>
          {/* Student Card */}
          <div style={styles.studentCard}>
            <div style={styles.sAvatar(selected.avatar_color)}>{selected.nickname?.[0]?.toUpperCase()}</div>
            <div style={styles.sInfo}>
              <div style={styles.sName}>{selected.nickname} · {selected.first_name} {selected.last_name}</div>
              <div style={styles.sMeta}>@{selected.username} · {selected.school}</div>
              <div style={styles.sPts}>💰 แต้มปัจจุบัน: {selected.points}</div>
            </div>
            <button style={styles.clearBtn} onClick={() => setSelected(null)}>✕</button>
          </div>

          {/* Points Input */}
          <div className="input-group">
            <label className="input-label">จำนวนแต้ม</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="เช่น 10"
              value={points}
              onChange={e => setPoints(e.target.value)}
              style={{ fontSize: '1.4rem', fontFamily: 'Sora, sans-serif', fontWeight: 700, textAlign: 'center' }}
            />
          </div>

          {/* Quick Points */}
          <div style={styles.quickPts}>
            {[1, 2, 3, 5, 10, 20, 50, 100].map(p => (
              <button key={p} style={styles.quickPtBtn} onClick={() => setPoints(String(p))}>+{p}</button>
            ))}
          </div>

          {/* Reason */}
          <div className="input-group">
            <label className="input-label">เหตุผล (ถ้ามี)</label>
            <input
              className="input"
              placeholder="เช่น ตอบคำถามได้ถูกต้อง"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleAssign}
            disabled={submitting || !points}
            style={{ marginTop: 8 }}
          >
            {submitting
              ? <><span className="spinner" /> กำลังให้แต้ม...</>
              : `⭐ ให้ ${points || '?'} แต้มแก่ ${selected.nickname}`
            }
          </button>
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
  },
  headerTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white',
  },
  tabs: {
    display: 'flex', gap: 0, margin: '16px', background: 'white',
    borderRadius: 14, padding: 4,
    boxShadow: '0 2px 8px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
  },
  tab: {
    flex: 1, padding: '10px', border: 'none', background: 'transparent',
    borderRadius: 10, fontFamily: 'Sora, sans-serif', fontWeight: 600,
    fontSize: '0.88rem', color: '#9898AD', cursor: 'pointer', transition: 'all 0.2s',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #6C3AF7, #4519C9)',
    color: 'white', boxShadow: '0 2px 8px rgba(108,58,247,0.3)',
  },
  scannerWrap: { padding: '0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  scanner: { width: '100%', maxWidth: 380, borderRadius: 16, overflow: 'hidden' },
  scanHint: { fontSize: '0.85rem', color: '#6E6E88', textAlign: 'center' },
  searchWrap: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  searching: { fontSize: '0.85rem', color: '#9898AD', textAlign: 'center', padding: '12px 0' },
  resultList: {
    background: 'white', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(108,58,247,0.1)',
    border: '1px solid rgba(108,58,247,0.08)',
  },
  resultItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderBottom: '1px solid #F4F4F6',
    background: 'none', border: 'none', width: '100%', cursor: 'pointer',
    textAlign: 'left', transition: 'background 0.15s',
  },
  noResult: {
    textAlign: 'center', color: '#9898AD', fontSize: '0.85rem', padding: '20px 0',
  },
  assignWrap: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  studentCard: {
    background: 'white', borderRadius: 14, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: '0 4px 16px rgba(108,58,247,0.1)',
    border: '2px solid #6C3AF7',
  },
  sAvatar: (color) => ({
    width: 44, height: 44, borderRadius: '50%',
    background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.1rem', fontWeight: 800, color: 'white',
    fontFamily: 'Sora, sans-serif', flexShrink: 0,
  }),
  sInfo: { flex: 1, minWidth: 0 },
  sName: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.9rem', color: '#1A1A2E',
  },
  sMeta: { fontSize: '0.75rem', color: '#9898AD', marginTop: 2 },
  sPts: { fontSize: '0.78rem', color: '#6C3AF7', fontWeight: 600, marginTop: 2 },
  sArrow: { fontSize: '1.2rem', color: '#9898AD', flexShrink: 0 },
  clearBtn: {
    width: 28, height: 28, borderRadius: '50%', background: '#F4F4F6',
    border: 'none', fontSize: '0.8rem', cursor: 'pointer', color: '#9898AD',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  quickPts: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
  },
  quickPtBtn: {
    padding: '8px 14px', borderRadius: 20,
    background: '#EDE5FF', border: '2px solid #D8C9FF',
    color: '#6C3AF7', fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s',
  },
}
