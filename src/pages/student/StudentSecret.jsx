import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

const SECRET_CODE = 'FFMCHY'

export default function StudentSecret() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('ff_secret_unlocked') === '1')
  const [codeInput, setCodeInput] = useState('')
  const [secretPoints, setSecretPoints] = useState(profile?.secret_points || 0)
  const [showQR, setShowQR] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [slip, setSlip] = useState(null)

  // Once unlocked: fetch points, poll every 3s, and subscribe to realtime updates
  useEffect(() => {
    if (!unlocked || !profile?.id) return

    refreshSecretPoints()

    const interval = setInterval(refreshSecretPoints, 3000)

    const channel = supabase
      .channel('secret-points-' + profile.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`,
      }, (payload) => {
        if (payload.new && typeof payload.new.secret_points === 'number') {
          setSecretPoints(payload.new.secret_points)
        }
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [unlocked, profile?.id])

  async function refreshSecretPoints() {
    const { data, error } = await supabase.rpc('get_secret_points', { target_id: profile.id })
    if (!error && data !== null && data !== undefined) {
      setSecretPoints(data)
    } else {
      const { data: row } = await supabase.from('profiles').select('secret_points').eq('id', profile.id).single()
      if (row) setSecretPoints(row.secret_points || 0)
    }
  }

  function handleUnlock() {
    if (codeInput.trim().toUpperCase() === SECRET_CODE) {
      setUnlocked(true)
      sessionStorage.setItem('ff_secret_unlocked', '1')
      showToast('ปลดล็อกสำเร็จ! 🎉', 'success')
    } else {
      showToast('รหัสไม่ถูกต้อง ❌', 'error')
      setCodeInput('')
    }
  }

  async function handleTransfer() {
    const amount = parseInt(transferAmount)
    if (isNaN(amount) || amount <= 0) { showToast('กรุณาใส่จำนวนที่ถูกต้อง', 'error'); return }
    if (amount > secretPoints) { showToast('แต้มไม่พอ 😢', 'error'); return }

    setTransferring(true)
    try {
      const { data: newBalance, error } = await supabase.rpc('deduct_secret_points', {
        target_id: profile.id,
        amount: amount,
      })
      if (error) throw error
      if (newBalance === -1) {
        // RPC signals insufficient balance
        await refreshSecretPoints()
        showToast('แต้มไม่พอ 😢', 'error')
        setTransferring(false)
        return
      }
      setSecretPoints(newBalance)
      const sentAmount = amount
      setTransferAmount('')
      setShowTransfer(false)
      setSlip({ amount: sentAmount, balance: newBalance, time: new Date() })
    } catch (err) {
      showToast('ผิดพลาด: ' + (err?.message || 'unknown'), 'error')
    } finally {
      setTransferring(false)
    }
  }

  // QR payload - flagged as secret so teacher's scanner adds to secret_points
  const qrData = JSON.stringify({
    type: 'ff_wallet_secret',
    id: profile.id,
    username: profile.username,
    nickname: profile.nickname,
  })

  // ===== Gate (code entry) =====
  if (!unlocked) {
    return (
      <div style={styles.gatePage}>
        <Toast toast={toast} />
        <div style={styles.gateBack}>
          <button onClick={() => navigate('/student')} style={styles.backBtn}>← กลับ</button>
        </div>
        <div style={styles.gateContent}>
          <div style={styles.lockEmoji}>🔒</div>
          <div style={styles.gateTitle}>กิจกรรมลับ</div>
          <div style={styles.gateDesc}>กรอกรหัส 6 ตัวเพื่อปลดล็อก</div>

          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            maxLength={6}
            placeholder="● ● ● ● ● ●"
            style={styles.codeInput}
            autoFocus
          />
          <button onClick={handleUnlock} style={styles.unlockBtn} disabled={codeInput.length < 6}>
            🔓 ปลดล็อก
          </button>
        </div>
        <BottomNav role="student" />
      </div>
    )
  }

  // ===== Unlocked (main secret page) =====
  return (
    <div style={styles.page}>
      <Toast toast={toast} />
      <style>{`@keyframes slipPop { from { opacity: 0; transform: scale(0.8) translateY(20px) } to { opacity: 1; transform: scale(1) translateY(0) } }`}</style>

      <div style={styles.header}>
        <button onClick={() => navigate('/student')} style={styles.backBtnLight}>← กลับ</button>
        <div style={styles.headerTitle}>🎁 กิจกรรมลับ</div>
        <div style={{ width: 40 }} />
      </div>

      {/* Balance card */}
      <div style={styles.balanceCard}>
        <div style={styles.balanceOrb1} />
        <div style={styles.balanceOrb2} />
        <div style={styles.balanceLabel}>แต้มกิจกรรมลับ</div>
        <div style={styles.balanceBig}>{secretPoints.toLocaleString()}</div>
        <div style={styles.balanceUnit}>แต้ม</div>
      </div>

      {/* Action buttons */}
      <div style={styles.actions}>
        <button style={styles.receiveBtn} onClick={() => { setShowQR(true); refreshSecretPoints() }}>
          <div style={styles.actionEmoji}>📥</div>
          <div style={styles.actionLabel}>รับเงิน</div>
        </button>
        <button style={styles.transferBtn} onClick={() => setShowTransfer(true)}>
          <div style={styles.actionEmoji}>📤</div>
          <div style={styles.actionLabel}>โอนเงิน</div>
        </button>
      </div>

      {/* Receive QR Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ textAlign: 'center' }}>
              <h2 style={styles.modalTitle}>📥 รับเงิน</h2>
              <p style={styles.modalDesc}>ให้ครูสแกน QR นี้เพื่อรับแต้ม</p>
              <div style={styles.qrBox}>
                <QRCodeSVG value={qrData} size={220} bgColor="transparent" fgColor="#1A1A2E" level="M" />
              </div>
              <div style={styles.qrName}>{profile.nickname}</div>
              <div style={styles.qrBalance}>แต้มปัจจุบัน: {secretPoints}</div>
              <button className="btn btn-secondary btn-full" style={{ marginTop: 16 }} onClick={() => setShowQR(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="modal-overlay" onClick={() => setShowTransfer(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📤</div>
              <h2 style={styles.modalTitle}>โอนเงิน</h2>
              <p style={styles.modalDesc}>แต้มคงเหลือ: {secretPoints}</p>
            </div>

            <div className="input-group">
              <label className="input-label">จำนวนที่จะโอน</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                placeholder="เช่น 100"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                style={{ fontSize: '1.4rem', fontFamily: 'Sora, sans-serif', fontWeight: 700, textAlign: 'center' }}
                autoFocus
              />
            </div>

            {parseInt(transferAmount) > secretPoints && (
              <div style={styles.notEnough}>❌ แต้มไม่เพียงพอ</div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowTransfer(false); setTransferAmount('') }}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleTransfer}
                disabled={transferring || !transferAmount || parseInt(transferAmount) > secretPoints || parseInt(transferAmount) <= 0}>
                {transferring ? <><span className="spinner" /> กำลังโอน...</> : '✅ ยืนยันโอน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Slip */}
      {slip && (
        <div style={styles.slipOverlay} onClick={() => setSlip(null)}>
          <div style={styles.slip} onClick={e => e.stopPropagation()}>
            <div style={styles.slipCheck}>✓</div>
            <div style={styles.slipTitle}>โอนสำเร็จ</div>
            <div style={styles.slipAmount}>-{slip.amount.toLocaleString()}</div>
            <div style={styles.slipAmountUnit}>แต้ม</div>

            <div style={styles.slipDivider} />

            <div style={styles.slipRow}>
              <span style={styles.slipLabel}>จาก</span>
              <span style={styles.slipValue}>{profile.nickname}</span>
            </div>
            <div style={styles.slipRow}>
              <span style={styles.slipLabel}>คงเหลือ</span>
              <span style={styles.slipValue}>{slip.balance.toLocaleString()} แต้ม</span>
            </div>
            <div style={styles.slipRow}>
              <span style={styles.slipLabel}>วันที่</span>
              <span style={styles.slipValue}>
                {slip.time.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })} {slip.time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div style={styles.slipHint}>แตะที่ไหนก็ได้เพื่อปิด</div>
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
      <BottomNav role="student" />
    </div>
  )
}

const styles = {
  // Gate
  gatePage: { minHeight: '100dvh', background: 'linear-gradient(160deg, #1A1A2E 0%, #2D2D4A 60%, #3C3454 100%)', display: 'flex', flexDirection: 'column' },
  gateBack: { padding: '52px 16px 0' },
  gateContent: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '20px 24px', gap: 16,
  },
  lockEmoji: { fontSize: '4.5rem', filter: 'drop-shadow(0 0 24px rgba(245,200,66,0.3))' },
  gateTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'white' },
  gateDesc: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  codeInput: {
    width: '100%', maxWidth: 280, padding: '16px', borderRadius: 16,
    background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)',
    color: 'white', fontFamily: 'Space Mono, monospace', fontWeight: 700,
    fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.3em',
    outline: 'none', textTransform: 'uppercase',
  },
  unlockBtn: {
    width: '100%', maxWidth: 280, padding: '14px', borderRadius: 14,
    background: '#F5C842', color: '#1A1A2E', border: 'none',
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
  },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },

  // Main
  page: { minHeight: '100dvh', background: '#F5F0FF' },
  header: {
    background: 'linear-gradient(135deg, #1A1A2E 0%, #3C3454 100%)',
    padding: '52px 16px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtnLight: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'white' },
  balanceCard: {
    margin: '16px',
    background: 'linear-gradient(135deg, #2D2D4A 0%, #1A1A2E 100%)',
    borderRadius: 24, padding: '36px 24px 32px',
    textAlign: 'center', position: 'relative', overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(26,26,46,0.4)',
    border: '1px solid rgba(245,200,66,0.2)',
  },
  balanceOrb1: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,200,66,0.2) 0%, transparent 70%)' },
  balanceOrb2: { position: 'absolute', bottom: -40, left: -40, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,58,247,0.25) 0%, transparent 70%)' },
  balanceLabel: { fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Sora, sans-serif', marginBottom: 8 },
  balanceBig: { fontFamily: 'Sora, sans-serif', fontSize: '5rem', fontWeight: 800, color: '#F5C842', lineHeight: 1, textShadow: '0 4px 24px rgba(245,200,66,0.3)', letterSpacing: '-0.04em' },
  balanceUnit: { fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'Sora, sans-serif', marginTop: 6 },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px' },
  receiveBtn: {
    background: 'white', borderRadius: 18, padding: '24px 16px',
    border: '2px solid #00D9A3', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    boxShadow: '0 4px 16px rgba(0,217,163,0.15)',
  },
  transferBtn: {
    background: 'white', borderRadius: 18, padding: '24px 16px',
    border: '2px solid #6C3AF7', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    boxShadow: '0 4px 16px rgba(108,58,247,0.15)',
  },
  actionEmoji: { fontSize: '2.2rem' },
  actionLabel: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#1A1A2E' },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#1A1A2E' },
  modalDesc: { fontSize: '0.85rem', color: '#6E6E88', marginTop: 4 },
  qrBox: {
    background: 'white', borderRadius: 20, padding: 20, margin: '16px auto',
    width: 'fit-content', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '2px solid #F4F4F6',
  },
  qrName: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#1A1A2E' },
  qrBalance: { fontSize: '0.85rem', color: '#6E6E88', marginTop: 4 },
  notEnough: { background: '#FFE5E5', color: '#C53030', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center', marginTop: 10 },
  slipOverlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(26,26,46,0.85)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    animation: 'fadeIn 0.25s ease',
  },
  slip: {
    background: 'white', borderRadius: 24, padding: '32px 28px',
    width: '100%', maxWidth: 320, textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    animation: 'slipPop 0.35s cubic-bezier(0.18,0.89,0.32,1.28)',
  },
  slipCheck: {
    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
    background: 'linear-gradient(135deg, #00D9A3, #00A36C)', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '2rem', fontWeight: 800,
    boxShadow: '0 8px 24px rgba(0,217,163,0.4)',
  },
  slipTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#1A1A2E' },
  slipAmount: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '3rem', color: '#FF6B6B', lineHeight: 1.1, marginTop: 12 },
  slipAmountUnit: { fontSize: '0.9rem', color: '#9898AD', marginTop: 2 },
  slipDivider: { height: 1, background: 'repeating-linear-gradient(90deg, #E8E8EF 0, #E8E8EF 6px, transparent 6px, transparent 12px)', margin: '20px 0' },
  slipRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' },
  slipLabel: { fontSize: '0.85rem', color: '#9898AD' },
  slipValue: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#1A1A2E' },
  slipHint: { fontSize: '0.75rem', color: '#C9C9D6', marginTop: 20 },
}