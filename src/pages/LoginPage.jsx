import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Toast, useToast } from '../hooks/useToast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      // Find user by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', form.username.trim().toLowerCase())
        .single()

      if (profileError || !profile) {
        showToast('ไม่พบ username นี้', 'error')
        return
      }

      // Use username as email (stored as username@ffwallet.local)
      const email = `${form.username.trim().toLowerCase()}@ffwallet.local`
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      })

      if (error) {
        showToast('รหัสผ่านไม่ถูกต้อง', 'error')
        return
      }

      navigate('/')
    } catch {
      showToast('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      {/* Background decoration */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoTitle}>FF Wallet</div>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <h1 style={styles.heading}>เข้าสู่ระบบ</h1>
          <p style={styles.subheading}>ใส่ username และรหัสผ่านเพื่อเข้าใช้งาน</p>

          <form onSubmit={handleLogin} style={styles.form}>
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                className="input"
                type="text"
                placeholder="username ของคุณ"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">รหัสผ่าน</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? <><span className="spinner" /> กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>หรือ</span>
            <div style={styles.dividerLine} />
          </div>

          <Link to="/register" style={{ textDecoration: 'none' }}>
            <button className="btn btn-secondary btn-full">
              สมัครสมาชิกใหม่
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'linear-gradient(160deg, #f5f0ff 0%, #ede5ff 50%, #d8c9ff 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOrb1: {
    position: 'absolute',
    top: '-80px',
    right: '-80px',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108,58,247,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: '-60px',
    left: '-60px',
    width: '240px',
    height: '240px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108,58,247,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: {
    fontFamily: 'Sora, sans-serif',
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#6C3AF7',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  card: {
    background: 'white',
    borderRadius: '24px',
    padding: '28px 24px',
    boxShadow: '0 8px 32px rgba(108,58,247,0.12), 0 2px 8px rgba(108,58,247,0.06)',
    border: '1px solid rgba(108,58,247,0.1)',
  },
  heading: {
    fontFamily: 'Sora, sans-serif',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: '6px',
  },
  subheading: {
    fontSize: '0.85rem',
    color: '#6E6E88',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#E8E8EF',
  },
  dividerText: {
    fontSize: '0.8rem',
    color: '#9898AD',
    fontWeight: '500',
  },
}