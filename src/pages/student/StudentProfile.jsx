import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import { AvatarSVG, AvatarBuilderUI, DEFAULT_AVATAR } from '../../components/shared/AvatarBuilder'
import BottomNav from '../../components/shared/BottomNav'

export default function StudentProfile() {
  const { profile, refreshProfile } = useAuth()
  const { toast, showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [avatar, setAvatar] = useState(
    profile?.avatar_config ? JSON.parse(profile.avatar_config) : { ...DEFAULT_AVATAR, skinColor: profile?.avatar_color || '#FDDBB4' }
  )

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        avatar_config: JSON.stringify(avatar),
        avatar_color: avatar.skinColor,
      }).eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      showToast('บันทึกสำเร็จ! 🎉', 'success')
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      <div style={styles.header}>
        <div style={styles.headerTitle}>🎨 แก้ไข Avatar</div>
      </div>

      <div style={styles.content}>
        {/* Profile Info */}
        <div style={styles.infoCard}>
          <div style={styles.avatarPreview}>
            <AvatarSVG config={avatar} size={80} />
          </div>
          <div>
            <div style={styles.name}>{profile.nickname}</div>
            <div style={styles.meta}>{profile.first_name} {profile.last_name}</div>
            <div style={styles.meta}>@{profile.username} · {profile.school}</div>
          </div>
        </div>

        {/* Builder */}
        <div style={styles.builderCard}>
          <AvatarBuilderUI config={avatar} onChange={setAvatar} />
        </div>

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><span className="spinner" /> กำลังบันทึก...</> : '💾 บันทึก Avatar'}
        </button>
      </div>

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
  },
  headerTitle: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white' },
  content: { padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 },
  infoCard: {
    background: 'white', borderRadius: 16, padding: '16px',
    display: 'flex', alignItems: 'center', gap: 16,
    boxShadow: '0 2px 12px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
  },
  avatarPreview: {
    width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
    background: '#F5F0FF', flexShrink: 0,
    border: '3px solid rgba(108,58,247,0.2)',
  },
  name: { fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#1A1A2E' },
  meta: { fontSize: '0.78rem', color: '#9898AD', marginTop: 3 },
  builderCard: {
    background: 'white', borderRadius: 16, padding: '16px',
    boxShadow: '0 2px 12px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
  },
}