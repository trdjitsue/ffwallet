import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

const EMOJIS = ['🎁', '🍬', '🏆', '📚', '🪑', '🎯', '🎮', '🌟', '💎', '🎨', '🎵', '🍕', '🎉', '🔑', '👑']
const CATEGORIES = [
  { value: 'item', label: '🎁 ของรางวัล' },
  { value: 'activity', label: '🎯 กิจกรรม' },
  { value: 'privilege', label: '👑 สิทธิพิเศษ' },
]

const emptyForm = { title: '', description: '', points_cost: '', category: 'item', image_emoji: '🎁', stock: -1 }

export default function TeacherShop() {
  const { profile } = useAuth()
  const { toast, showToast } = useToast()
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [pendingRedemptions, setPendingRedemptions] = useState([])
  const [tab, setTab] = useState('rewards') // 'rewards' | 'redemptions'
  const [selectedReward, setSelectedReward] = useState(null)
  const [rewardRedemptions, setRewardRedemptions] = useState([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [rewardsRes, redemptionsRes] = await Promise.all([
      supabase.from('rewards').select('*').order('points_cost'),
      supabase.from('redemptions')
        .select('*, student:student_id(nickname, avatar_color), reward:reward_id(title, image_emoji)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])
    setRewards(rewardsRes.data || [])
    setPendingRedemptions(redemptionsRes.data || [])
    setLoading(false)
  }

  async function fetchRewardRedemptions(rewardId) {
    const { data } = await supabase
      .from('redemptions')
      .select('*, student:student_id(nickname, avatar_color, first_name, last_name)')
      .eq('reward_id', rewardId)
      .order('created_at', { ascending: false })
    setRewardRedemptions(data || [])
  }

  async function handleCreate() {
    if (!form.title.trim()) { showToast('ใส่ชื่อของรางวัล', 'error'); return }
    if (!form.points_cost) { showToast('ใส่จำนวนแต้ม', 'error'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('rewards').insert({
        title: form.title.trim(),
        description: form.description.trim(),
        points_cost: parseInt(form.points_cost),
        category: form.category,
        image_emoji: form.image_emoji,
        stock: parseInt(form.stock) || -1,
        is_active: true,
        created_by: profile.id,
      })
      if (error) throw error
      showToast('เพิ่มของรางวัลสำเร็จ!', 'success')
      setShowCreate(false)
      setForm(emptyForm)
      fetchAll()
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteReward(id) {
    if (!window.confirm("ลบของรางวัลนี้?")) return
    await supabase.from("rewards").delete().eq("id", id)
    fetchAll()
    showToast("ลบของรางวัลแล้ว", "info")
  }

  async function toggleReward(reward) {
    await supabase.from('rewards').update({ is_active: !reward.is_active }).eq('id', reward.id)
    fetchAll()
    showToast(reward.is_active ? 'ซ่อนของรางวัลแล้ว' : 'แสดงของรางวัลแล้ว', 'info')
  }

  async function approveRedemption(id, approve) {
    const status = approve ? 'approved' : 'rejected'
    await supabase.from('redemptions').update({ status, approved_by: profile.id }).eq('id', id)

    if (!approve) {
      // Refund points
      const redemption = pendingRedemptions.find(r => r.id === id)
      if (redemption) {
        await supabase.from('point_transactions').insert({
          student_id: redemption.student_id,
          teacher_id: profile.id,
          points: redemption.points_spent,
          transaction_type: 'earn',
          reason: `คืนแต้ม: ${redemption.reward?.title}`,
        })
      }
    }

    showToast(approve ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธและคืนแต้มแล้ว', approve ? 'success' : 'info')
    fetchAll()
  }

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      <div style={styles.header}>
        <div style={styles.headerTitle}>🛍️ จัดการร้านค้า</div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowCreate(true)}>+ เพิ่มของ</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabRow}>
        <button style={{ ...styles.tab, ...(tab === 'rewards' ? styles.tabActive : {}) }}
          onClick={() => setTab('rewards')}>
          🎁 ของรางวัล ({rewards.length})
        </button>
        <button style={{ ...styles.tab, ...(tab === 'redemptions' ? styles.tabActive : {}) }}
          onClick={() => setTab('redemptions')}>
          ⏳ รอการอนุมัติ
          {pendingRedemptions.length > 0 && (
            <span style={styles.badge}>{pendingRedemptions.length}</span>
          )}
        </button>
      </div>

      {/* Rewards Tab */}
      {tab === 'rewards' && (
        <div style={styles.content}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9898AD' }}>กำลังโหลด...</div>
          ) : rewards.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 30 }}>
              <span className="emoji">🛒</span>
              <p>ยังไม่มีของรางวัล</p>
            </div>
          ) : (
            rewards.map(r => (
              <div key={r.id} style={{ ...styles.rewardRow, opacity: r.is_active ? 1 : 0.5, cursor: 'pointer' }}
                onClick={() => { setSelectedReward(r); fetchRewardRedemptions(r.id) }}>
                <div style={styles.rewardEmoji}>{r.image_emoji}</div>
                <div style={styles.rewardInfo}>
                  <div style={styles.rewardTitle}>{r.title}</div>
                  <div style={styles.rewardMeta}>
                    💰 {r.points_cost} แต้ม · {r.stock === -1 ? 'ไม่จำกัด' : `เหลือ ${r.stock}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <button
                    style={{ ...styles.toggleBtn, background: r.is_active ? '#D0FFF4' : '#F4F4F6', color: r.is_active ? '#007A5A' : '#9898AD' }}
                    onClick={() => toggleReward(r)}
                  >
                    {r.is_active ? 'เปิด' : 'ปิด'}
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => deleteReward(r.id)}
                  >🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Redemptions Tab */}
      {tab === 'redemptions' && (
        <div style={styles.content}>
          {pendingRedemptions.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 30 }}>
              <span className="emoji">✅</span>
              <p>ไม่มีรายการรอการอนุมัติ</p>
            </div>
          ) : (
            pendingRedemptions.map(r => (
              <div key={r.id} style={styles.redemptionCard}>
                <div style={styles.redemptionTop}>
                  <div style={styles.rAvatar(r.student?.avatar_color)}>
                    {r.student?.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.rName}>{r.student?.nickname}</div>
                    <div style={styles.rReward}>
                      {r.reward?.image_emoji} {r.reward?.title} · {r.points_spent} แต้ม
                    </div>
                    <div style={styles.rTime}>
                      {new Date(r.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div style={styles.redemptionBtns}>
                  <button className="btn btn-sm" style={{ flex: 1, background: '#FFE5E5', color: '#C53030', border: 'none' }}
                    onClick={() => approveRedemption(r.id, false)}>
                    ❌ ปฏิเสธ
                  </button>
                  <button className="btn btn-sm btn-primary" style={{ flex: 2 }}
                    onClick={() => approveRedemption(r.id, true)}>
                    ✅ อนุมัติ
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reward Detail Modal */}
      {selectedReward && (
        <div className="modal-overlay" onClick={() => setSelectedReward(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85dvh' }}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ fontSize: '2.5rem' }}>{selectedReward.image_emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.modalTitle}>{selectedReward.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#9898AD', marginTop: 4 }}>
                  💰 {selectedReward.points_cost} แต้ม · {selectedReward.stock === -1 ? 'ไม่จำกัด' : `เหลือ ${selectedReward.stock}`}
                </div>
              </div>
            </div>

            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#6E6E88', marginBottom: 10 }}>
              ประวัติการแลก ({rewardRedemptions.length} ครั้ง)
            </div>

            {rewardRedemptions.length === 0 ? (
              <div className="empty-state">
                <span className="emoji">📭</span>
                <p>ยังไม่มีใครแลก</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '50dvh', overflowY: 'auto' }}>
                {rewardRedemptions.map(r => (
                  <div key={r.id} style={styles.redemptionRow}>
                    <div style={styles.rAvatar(r.student?.avatar_color)}>
                      {r.student?.nickname?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#1A1A2E' }}>
                        {r.student?.nickname}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9898AD' }}>
                        {r.student?.first_name} {r.student?.last_name} · {new Date(r.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.72rem', fontWeight: 700, borderRadius: 8, padding: '3px 8px',
                      background: r.status === 'approved' ? '#D0FFF4' : r.status === 'rejected' ? '#FFE5E5' : '#FFF9E0',
                      color: r.status === 'approved' ? '#007A5A' : r.status === 'rejected' ? '#C53030' : '#8a6500',
                    }}>
                      {r.status === 'approved' ? '✅ อนุมัติ' : r.status === 'rejected' ? '❌ ปฏิเสธ' : '⏳ รอ'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Reward Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={styles.modalTitle}>🎁 เพิ่มของรางวัล</h2>

            {/* Emoji Picker */}
            <div style={styles.emojiPicker}>
              {EMOJIS.map(em => (
                <button key={em} style={{ ...styles.emojiBtn, ...(form.image_emoji === em ? styles.emojiActive : {}) }}
                  onClick={() => setForm(f => ({ ...f, image_emoji: em }))}>
                  {em}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              <div className="input-group">
                <label className="input-label">ชื่อของรางวัล *</label>
                <input className="input" placeholder="เช่น ขนมฟรี 1 ชิ้น"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">คำอธิบาย</label>
                <input className="input" placeholder="รายละเอียดเพิ่มเติม"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">แต้มที่ใช้ *</label>
                  <input className="input" type="number" inputMode="numeric" placeholder="50"
                    value={form.points_cost} onChange={e => setForm(f => ({ ...f, points_cost: e.target.value }))}
                    style={{ fontFamily: 'Sora', fontWeight: 700, textAlign: 'center' }} />
                </div>
                <div className="input-group">
                  <label className="input-label">จำนวน (-1=ไม่จำกัด)</label>
                  <input className="input" type="number" inputMode="numeric" placeholder="-1"
                    value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    style={{ textAlign: 'center' }} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">หมวดหมู่</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreate} disabled={saving}>
                {saving ? <><span className="spinner" /> กำลังบันทึก...</> : '✨ เพิ่มของรางวัล'}
              </button>
            </div>
          </div>
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
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white',
  },
  tabRow: {
    display: 'flex', gap: 0, margin: '16px', background: 'white',
    borderRadius: 14, padding: 4,
    boxShadow: '0 2px 8px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
  },
  tab: {
    flex: 1, padding: '10px 8px', border: 'none', background: 'transparent',
    borderRadius: 10, fontFamily: 'Sora, sans-serif', fontWeight: 600,
    fontSize: '0.82rem', color: '#9898AD', cursor: 'pointer',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  tabActive: {
    background: 'linear-gradient(135deg, #6C3AF7, #4519C9)',
    color: 'white', boxShadow: '0 2px 8px rgba(108,58,247,0.3)',
  },
  badge: {
    background: '#FF6B6B', color: 'white', borderRadius: 99,
    padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700,
  },
  content: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  rewardRow: {
    background: 'white', borderRadius: 14, padding: '12px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: '0 2px 10px rgba(108,58,247,0.07)',
    border: '1px solid rgba(108,58,247,0.06)',
  },
  rewardEmoji: { fontSize: '1.8rem', flexShrink: 0 },
  rewardInfo: { flex: 1, minWidth: 0 },
  rewardTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E',
  },
  rewardMeta: { fontSize: '0.75rem', color: '#9898AD', marginTop: 2 },
  toggleBtn: {
    padding: '6px 12px', borderRadius: 8, border: 'none',
    fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
    flexShrink: 0, transition: 'all 0.2s',
  },
  redemptionRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 4px', borderBottom: '1px solid #F4F4F6',
  },
  rAvatar: (color) => ({
    width: 34, height: 34, borderRadius: '50%',
    background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', fontWeight: 800, color: 'white',
    fontFamily: 'Sora, sans-serif', flexShrink: 0,
  }),
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8, border: 'none',
    background: '#FFE5E5', cursor: 'pointer', fontSize: '0.85rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  redemptionCard: {
    background: 'white', borderRadius: 14, padding: '14px 16px',
    boxShadow: '0 2px 10px rgba(108,58,247,0.08)',
    border: '1px solid rgba(108,58,247,0.08)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  redemptionTop: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  rAvatar: (color) => ({
    width: 38, height: 38, borderRadius: '50%',
    background: color || '#6C3AF7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.95rem', fontWeight: 800, color: 'white',
    fontFamily: 'Sora, sans-serif', flexShrink: 0,
  }),
  rName: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E',
  },
  rReward: { fontSize: '0.8rem', color: '#6E6E88', marginTop: 3 },
  rTime: { fontSize: '0.72rem', color: '#9898AD', marginTop: 2 },
  redemptionBtns: { display: 'flex', gap: 8 },
  modalTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#1A1A2E', marginBottom: 16,
  },
  emojiPicker: {
    display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8,
  },
  emojiBtn: {
    width: 40, height: 40, borderRadius: 10, border: '2px solid #E8E8EF',
    background: 'white', fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  emojiActive: {
    border: '2px solid #6C3AF7', background: '#EDE5FF',
    boxShadow: '0 2px 8px rgba(108,58,247,0.3)',
  },
}