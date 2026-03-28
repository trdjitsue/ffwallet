import { Link, useLocation } from 'react-router-dom'

export default function BottomNav({ role }) {
  const location = useLocation()
  const path = location.pathname

  const studentTabs = [
    { to: '/student', icon: '🏠', label: 'หน้าแรก' },
    { to: '/student/courses', icon: '📚', label: 'คอร์ส' },
    { to: '/student/shop', icon: '🛍️', label: 'แลกของ' },
    { to: '/student/tests', icon: '📝', label: 'กิจกรรม' },
    { to: '/student/qr', icon: '📱', label: 'QR' },
  ]

  const teacherTabs = [
    { to: '/teacher', icon: '🏠', label: 'หน้าแรก' },
    { to: '/teacher/feed', icon: '📢', label: 'Feed' },
    { to: '/teacher/courses', icon: '📚', label: 'คอร์ส' },
    { to: '/teacher/assign', icon: '⭐', label: 'ให้แต้ม' },
    { to: '/teacher/ranking', icon: '🏆', label: 'อันดับ' },
  ]

  const adminTabs = [
    { to: '/admin', icon: '⚡', label: 'Admin' },
    { to: '/teacher', icon: '🏠', label: 'ครู' },
    { to: '/teacher/assign', icon: '⭐', label: 'ให้แต้ม' },
  ]

  const tabs = role === 'admin' ? adminTabs : role === 'teacher' ? teacherTabs : studentTabs

  return (
    <nav style={styles.nav}>
      {tabs.map(tab => {
        const isActive = path === tab.to
        return (
          <Link key={tab.to} to={tab.to} style={styles.tab}>
            <div style={{ ...styles.iconWrap, ...(isActive ? styles.iconActive : {}) }}>
              <span style={styles.icon}>{tab.icon}</span>
            </div>
            <span style={{ ...styles.label, ...(isActive ? styles.labelActive : {}) }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(108,58,247,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
    zIndex: 100,
    boxShadow: '0 -4px 20px rgba(108,58,247,0.08)',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    textDecoration: 'none', flex: 1, padding: '4px 8px',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  iconActive: {
    background: 'linear-gradient(135deg, #6C3AF7, #4519C9)',
    boxShadow: '0 4px 12px rgba(108,58,247,0.35)',
    transform: 'scale(1.05)',
  },
  icon: { fontSize: '1.25rem' },
  label: {
    fontSize: '0.65rem', fontWeight: 600,
    color: '#9898AD', fontFamily: 'Noto Sans Thai, sans-serif',
    letterSpacing: '-0.01em',
  },
  labelActive: { color: '#6C3AF7' },
}