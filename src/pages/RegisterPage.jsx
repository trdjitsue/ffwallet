import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Toast, useToast } from '../hooks/useToast'

const AVATAR_COLORS = [
  '#6C3AF7', '#9B72FF', '#FF6B6B', '#F5C842',
  '#00D9A3', '#4ECDC4', '#FF8E53', '#A855F7'
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    firstName: '',
    lastName: '',
    school: '',
    avatarColor: AVATAR_COLORS[0],
  })

  function updateForm(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function validateStep1() {
    if (!form.username.trim()) { showToast('กรุณาใส่ username', 'error'); return false }
    if (form.username.length < 3) { showToast('username ต้องมีอย่างน้อย 3 ตัวอักษร', 'error'); return false }
    if (!/^[a-z0-9_]+$/i.test(form.username)) { showToast('username ใช้ได้แค่ a-z, 0-9, _', 'error'); return false }
    if (!form.password) { showToast('กรุณาใส่รหัสผ่าน', 'error'); return false }
    if (form.password.length < 6) { showToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัว', 'error'); return false }
    if (form.password !== form.confirmPassword) { showToast('รหัสผ่านไม่ตรงกัน', 'error'); return false }
    return true
  }

  function validateStep2() {
    if (!form.nickname.trim()) { showToast('กรุณาใส่ชื่อเล่น', 'error'); return false }
    if (!form.firstName.trim()) { showToast('กรุณาใส่ชื่อ', 'error'); return false }
    if (!form.lastName.trim()) { showToast('กรุณาใส่นามสกุล', 'error'); return false }
    if (!form.school.trim()) { showToast('กรุณาใส่ชื่อโรงเรียน', 'error'); return false }
    return true
  }

  async function handleRegister() {
    setLoading(true)
    try {
      const username = form.username.trim().toLowerCase()
      const email = `${username}@ffwallet.local`

      // Check username availability
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()

      if (existing) {
        showToast('username นี้ถูกใช้แล้ว', 'error')
        return
      }

      // Sign up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: { emailRedirectTo: null }
      })

      if (signUpError) throw signUpError

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        username,
        nickname: form.nickname.trim(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        school: form.school.trim(),
        role: 'student',
        avatar_color: form.avatarColor,
        points: 0,
        total_points_earned: 0,
      })

      if (profileError) throw profileError

      showToast('สมัครสำเร็จ! 🎉', 'success')
      setTimeout(() => navigate('/'), 1000)
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />
      <div style={styles.bgOrb} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <Link to="/login" style={styles.backBtn}>← กลับ</Link>
          <div style={styles.logoTitle}>💜 FF Wallet</div>
        </div>

        {/* Progress */}
        <div style={styles.progress}>
          <div style={{ ...styles.progressStep, ...(step >= 1 ? styles.progressActive : {}) }}>
            <span>1</span>
          </div>
          <div style={{ ...styles.progressLine, ...(step >= 2 ? { background: '#6C3AF7' } : {}) }} />
          <div style={{ ...styles.progressStep, ...(step >= 2 ? styles.progressActive : {}) }}>
            <span>2</span>
          </div>
          <div style={{ ...styles.progressLine, ...(step >= 3 ? { background: '#6C3AF7' } : {}) }} />
          <div style={{ ...styles.progressStep, ...(step >= 3 ? styles.progressActive : {}) }}>
            <span>3</span>
          </div>
        </div>

        {/* Card */}
        <div style={styles.card}>
          {step === 1 && (
            <Step1 form={form} updateForm={updateForm} onNext={() => validateStep1() && setStep(2)} />
          )}
          {step === 2 && (
            <Step2 form={form} updateForm={updateForm} onNext={() => validateStep2() && setStep(3)} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <Step3 form={form} updateForm={updateForm} onSubmit={handleRegister} onBack={() => setStep(2)} loading={loading} />
          )}
        </div>
      </div>
    </div>
  )
}

function Step1({ form, updateForm, onNext }) {
  return (
    <>
      <h2 style={styles.stepTitle}>ตั้ง Username & Password</h2>
      <p style={styles.stepSub}>ใช้สำหรับเข้าสู่ระบบทุกครั้ง</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="input-group">
          <label className="input-label">Username</label>
          <input className="input" placeholder="เช่น student123" value={form.username}
            onChange={e => updateForm('username', e.target.value)} autoCapitalize="none" />
          <span style={styles.hint}>ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข หรือ _ เท่านั้น</span>
        </div>
        <div className="input-group">
          <label className="input-label">รหัสผ่าน</label>
          <input className="input" type="password" placeholder="อย่างน้อย 6 ตัว" value={form.password}
            onChange={e => updateForm('password', e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">ยืนยันรหัสผ่าน</label>
          <input className="input" type="password" placeholder="ใส่รหัสผ่านอีกครั้ง" value={form.confirmPassword}
            onChange={e => updateForm('confirmPassword', e.target.value)} />
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={onNext} style={{ marginTop: 8 }}>
          ต่อไป →
        </button>
      </div>
    </>
  )
}

function Step2({ form, updateForm, onNext, onBack }) {
  return (
    <>
      <h2 style={styles.stepTitle}>ข้อมูลส่วนตัว</h2>
      <p style={styles.stepSub}>ข้อมูลนี้ครูและเพื่อนจะเห็น</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="input-group">
          <label className="input-label">ชื่อเล่น</label>
          <input className="input" placeholder="เช่น เบนซ์" value={form.nickname}
            onChange={e => updateForm('nickname', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="input-group">
            <label className="input-label">ชื่อ</label>
            <input className="input" placeholder="ชื่อจริง" value={form.firstName}
              onChange={e => updateForm('firstName', e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">นามสกุล</label>
            <input className="input" placeholder="นามสกุล" value={form.lastName}
              onChange={e => updateForm('lastName', e.target.value)} />
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">โรงเรียน</label>
          <input className="input" placeholder="ชื่อโรงเรียน" value={form.school}
            onChange={e => updateForm('school', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ flex: 1 }}>← กลับ</button>
          <button className="btn btn-primary" onClick={onNext} style={{ flex: 2 }}>ต่อไป →</button>
        </div>
      </div>
    </>
  )
}

function Step3({ form, updateForm, onSubmit, onBack, loading }) {
  return (
    <>
      <h2 style={styles.stepTitle}>เลือกสีประจำตัว</h2>
      <p style={styles.stepSub}>สีที่ใช้แสดงในระบบ</p>

      {/* Preview Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: form.avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, color: 'white',
          fontFamily: 'Sora, sans-serif',
          boxShadow: `0 0 24px ${form.avatarColor}60`,
          animation: 'scaleIn 0.3s ease',
        }}>
          {form.nickname?.[0]?.toUpperCase() || '?'}
        </div>
      </div>

      {/* Color Picker */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {AVATAR_COLORS.map(color => (
          <button
            key={color}
            onClick={() => updateForm('avatarColor', color)}
            style={{
              width: '100%', aspectRatio: '1',
              borderRadius: '50%', background: color,
              border: form.avatarColor === color ? '3px solid white' : '3px solid transparent',
              boxShadow: form.avatarColor === color ? `0 0 0 2px ${color}, 0 0 16px ${color}60` : 'none',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          />
        ))}
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryRow}><span>Username</span><strong>@{form.username}</strong></div>
        <div style={styles.summaryRow}><span>ชื่อเล่น</span><strong>{form.nickname}</strong></div>
        <div style={styles.summaryRow}><span>ชื่อ-นามสกุล</span><strong>{form.firstName} {form.lastName}</strong></div>
        <div style={styles.summaryRow}><span>โรงเรียน</span><strong>{form.school}</strong></div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ flex: 1 }}>← กลับ</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={loading} style={{ flex: 2 }}>
          {loading ? <><span className="spinner" /> กำลังสมัคร...</> : '✨ สมัครสมาชิก'}
        </button>
      </div>
    </>
  )
}

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'linear-gradient(160deg, #f5f0ff 0%, #ede5ff 60%, #d8c9ff 100%)',
    padding: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOrb: {
    position: 'absolute', top: '-100px', right: '-100px',
    width: '350px', height: '350px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108,58,247,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    width: '100%', maxWidth: '420px',
    display: 'flex', flexDirection: 'column', gap: 20,
    paddingTop: 16, paddingBottom: 40,
  },
  header: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    color: '#6C3AF7', fontWeight: 600, fontSize: '0.9rem',
    textDecoration: 'none', fontFamily: 'Sora, sans-serif',
  },
  logoTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.1rem', color: '#6C3AF7',
  },
  progress: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
  },
  progressStep: {
    width: 32, height: 32, borderRadius: '50%',
    background: '#E8E8EF', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', fontWeight: 700, color: '#9898AD',
    fontFamily: 'Sora, sans-serif', transition: 'all 0.3s',
  },
  progressActive: {
    background: 'linear-gradient(135deg, #6C3AF7, #4519C9)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(108,58,247,0.4)',
  },
  progressLine: {
    width: 40, height: 3, background: '#E8E8EF', transition: 'all 0.3s',
  },
  card: {
    background: 'white', borderRadius: '24px',
    padding: '28px 24px',
    boxShadow: '0 8px 32px rgba(108,58,247,0.12)',
    border: '1px solid rgba(108,58,247,0.1)',
    animation: 'scaleIn 0.2s ease',
  },
  stepTitle: {
    fontFamily: 'Sora, sans-serif', fontSize: '1.3rem', fontWeight: 700,
    color: '#1A1A2E', marginBottom: 6,
  },
  stepSub: {
    fontSize: '0.85rem', color: '#6E6E88', marginBottom: 24,
  },
  hint: {
    fontSize: '0.75rem', color: '#9898AD', marginTop: 4,
  },
  summary: {
    background: '#F5F0FF', borderRadius: 14, padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  summaryRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '0.85rem', color: '#6E6E88',
  },
}
