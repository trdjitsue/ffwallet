import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { Toast, useToast } from '../../hooks/useToast'
import { AvatarSVG, AvatarBuilderUI, DEFAULT_AVATAR } from '../../components/shared/AvatarBuilder'
import BottomNav from '../../components/shared/BottomNav'

export default function StudentQR() {
  const { profile, refreshProfile } = useAuth()
  const { toast, showToast } = useToast()
  const [showEdit, setShowEdit] = useState(false)
  const [nickname, setNickname] = useState(profile?.nickname || '')
  const [avatar, setAvatar] = useState(
    profile?.avatar_config ? JSON.parse(profile.avatar_config) : { ...DEFAULT_AVATAR, skinColor: profile?.avatar_color || '#FDDBB4' }
  )
  const [saving, setSaving] = useState(false)

  if (!profile) return null

  const avatarConfig = profile.avatar_config ? JSON.parse(profile.avatar_config) : { ...DEFAULT_AVATAR, skinColor: profile.avatar_color || '#FDDBB4' }

  const qrData = JSON.stringify({
    type: 'ff_wallet_student',
    id: profile.id,
    username: profile.username,
    nickname: profile.nickname,
    name: `${profile.first_name} ${profile.last_name}`,
  })

  async function handleSave() {
    if (!nickname.trim()) { showToast('ใส่ชื่อเล่นด้วยนะ', 'error'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        nickname: nickname.trim(),
        avatar_config: JSON.stringify(avatar),
        avatar_color: avatar.skinColor,
      }).eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      showToast('บันทึกสำเร็จ! 🎉', 'success')
      setShowEdit(false)
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      <div style={styles.header}>
        <div style={styles.headerTitle}>QR Code ของฉัน</div>
        <button style={styles.editBtn} onClick={() => {
          setNickname(profile.nickname)
          setAvatar(avatarConfig)
          setShowEdit(true)
        }}>
          ✏️ แก้ไข
        </button>
      </div>

      <div style={styles.content}>
        {/* Avatar */}
        <div style={styles.avatarWrap}>
          <div style={styles.avatarCircle}>
            <AvatarSVG config={avatarConfig} size={80} />
          </div>
          <div style={styles.name}>{profile.nickname}</div>
          <div style={styles.fullname}>{profile.first_name} {profile.last_name}</div>
          <div style={styles.school}>{profile.school}</div>
          <div style={styles.username}>@{profile.username}</div>
        </div>

        {/* QR Code */}
        <div style={styles.qrCard}>
          <div style={styles.qrInner}>
            <QRCodeSVG value={qrData} size={220} bgColor="transparent" fgColor="#1A1A2E" level="M" />
          </div>
          <div style={styles.qrLabel}>สแกน QR Code นี้</div>
        </div>

        {/* Points badge */}
        <div style={styles.pointsBadge}>
          <span style={styles.pointsNum}>{profile.points}</span>
          <span style={styles.pointsLabel}>แต้มคงเหลือ</span>
        </div>

        <p style={styles.hint}>💡 แสดง QR Code นี้ให้ครูสแกนเพื่อรับแต้ม</p>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
            <div className="modal-handle" />
            <h2 style={styles.modalTitle}>✏️ แก้ไขโปรไฟล์</h2>

            {/* Nickname */}
            <div className="input-group" style={{ marginTop: 16, marginBottom: 20 }}>
              <label className="input-label">ชื่อเล่น</label>
              <input
                className="input"
                placeholder="ชื่อเล่น"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                style={{ fontSize: '1.1rem', fontFamily: 'Sora', fontWeight: 700 }}
                autoFocus
              />
            </div>

            {/* Avatar Builder */}
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E', marginBottom: 12 }}>
              🎨 ตัวการ์ตูน
            </div>
            <AvatarBuilderUI config={avatar} onChange={setAvatar} />

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEdit(false)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> กำลังบันทึก...</> : '💾 บันทึก'}
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
  page: { minHeight: '100dvh', background: 'linear-gradient(160deg, #F5F0FF 0%, #EDE5FF 100%)' },
  header: {
    background: 'linear-gradient(135deg, #6C3AF7 0%, #4519C9 100%)',
    padding: '52px 20px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white' },
  editBtn: {
    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 20, padding: '6px 16px',
    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Sora, sans-serif',
  },
  content: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', gap: 20 },
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
    background: 'white', border: '3px solid rgba(108,58,247,0.2)',
    boxShadow: '0 8px 24px rgba(108,58,247,0.2)', marginBottom: 4,
  },
  name: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#1A1A2E' },
  fullname: { fontSize: '0.9rem', color: '#4A4A62', fontWeight: 500 },
  school: { fontSize: '0.8rem', color: '#9898AD' },
  username: {
    fontFamily: 'Space Mono, monospace', fontSize: '0.8rem',
    color: '#6C3AF7', fontWeight: 700,
    background: '#F0EBFF', padding: '2px 10px', borderRadius: 20, marginTop: 4,
  },
  qrCard: {
    background: 'white', borderRadius: 24, padding: '24px',
    boxShadow: '0 8px 32px rgba(108,58,247,0.15)',
    border: '2px solid rgba(108,58,247,0.1)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
  },
  qrInner: { padding: 4, background: 'white', borderRadius: 12 },
  qrLabel: { fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#6C3AF7' },
  pointsBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: 'linear-gradient(135deg, #6C3AF7, #4519C9)',
    borderRadius: 20, padding: '12px 32px',
    boxShadow: '0 8px 24px rgba(108,58,247,0.3)',
  },
  pointsNum: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '2rem', color: 'white', lineHeight: 1 },
  pointsLabel: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  hint: { fontSize: '0.82rem', color: '#9898AD', textAlign: 'center', maxWidth: 260 },
  modalTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#1A1A2E' },
}