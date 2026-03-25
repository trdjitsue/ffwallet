import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../hooks/useToast'
import BottomNav from '../../components/shared/BottomNav'

const CATEGORY_LABELS = {
  item: '🎁 ของรางวัล',
  activity: '🎯 กิจกรรม',
  privilege: '👑 สิทธิพิเศษ',
}

export default function StudentShop() {
  const { profile, refreshProfile } = useAuth()
  const { toast, showToast } = useToast()
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchRewards() }, [])

  async function fetchRewards() {
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost')
    setRewards(data || [])
    setLoading(false)
  }

  async function handleRedeem() {
    if (!selected) return
    if (profile.points < selected.points_cost) {
      showToast('แต้มไม่พอ 😢', 'error')
      return
    }
    setConfirming(true)
    try {
      // Create redemption record
      const { error: redError } = await supabase.from('redemptions').insert({
        student_id: profile.id,
        reward_id: selected.id,
        points_spent: selected.points_cost,
        status: 'pending',
      })
      if (redError) throw redError

      // Deduct points
      const { error: txError } = await supabase.from('point_transactions').insert({
        student_id: profile.id,
        points: selected.points_cost,
        transaction_type: 'spend',
        reason: `แลก: ${selected.title}`,
      })
      if (txError) throw txError

      showToast(`แลก "${selected.title}" สำเร็จ! 🎉`, 'success')
      setSelected(null)
      await refreshProfile()
      fetchRewards()
    } catch (err) {
      showToast('เกิดข้อผิดพลาด ลองใหม่', 'error')
    } finally {
      setConfirming(false)
    }
  }

  const filtered = filter === 'all' ? rewards : rewards.filter(r => r.category === filter)

  return (
    <div style={styles.page}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>🛍️ ร้านแลกของ</div>
        <div style={styles.pointsChip}>
          <span>💰</span>
          <span style={styles.pointsNum}>{profile?.points || 0} แต้ม</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={styles.filterWrap}>
        {['all', 'item', 'activity', 'privilege'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              ...styles.filterBtn,
              ...(filter === cat ? styles.filterActive : {}),
            }}
          >
            {cat === 'all' ? '✨ ทั้งหมด' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      <div style={styles.grid}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#9898AD' }}>
            กำลังโหลด...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1' }}>
            <div className="empty-state">
              <span className="emoji">🏪</span>
              <p>ยังไม่มีของในหมวดนี้</p>
            </div>
          </div>
        ) : (
          filtered.map(reward => (
            <RewardCard
              key={reward.id}
              reward={reward}
              canAfford={profile?.points >= reward.points_cost}
              onSelect={() => setSelected(reward)}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>{selected.image_emoji}</div>
              <h2 style={styles.modalTitle}>{selected.title}</h2>
              {selected.description && (
                <p style={styles.modalDesc}>{selected.description}</p>
              )}
            </div>

            <div style={styles.costRow}>
              <span style={styles.costLabel}>ราคา</span>
              <span style={styles.costValue}>{selected.points_cost} แต้ม</span>
            </div>
            <div style={styles.costRow}>
              <span style={styles.costLabel}>แต้มของคุณ</span>
              <span style={{ ...styles.costValue, color: profile?.points >= selected.points_cost ? '#00D9A3' : '#FF6B6B' }}>
                {profile?.points} แต้ม
              </span>
            </div>
            {profile?.points < selected.points_cost && (
              <div style={styles.notEnough}>❌ แต้มไม่เพียงพอ (ขาดอีก {selected.points_cost - profile.points} แต้ม)</div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelected(null)}>ยกเลิก</button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleRedeem}
                disabled={confirming || profile?.points < selected.points_cost}
              >
                {confirming ? <><span className="spinner" /> กำลังแลก...</> : '✨ ยืนยันแลก'}
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

function RewardCard({ reward, canAfford, onSelect }) {
  return (
    <div
      style={{ ...styles.rewardCard, ...(canAfford ? {} : styles.rewardCardDimmed) }}
      onClick={onSelect}
    >
      <div style={styles.rewardEmoji}>{reward.image_emoji}</div>
      <div style={styles.rewardTitle}>{reward.title}</div>
      <div style={styles.catBadge}>{CATEGORY_LABELS[reward.category]}</div>
      <div style={{ ...styles.rewardCost, color: canAfford ? '#6C3AF7' : '#9898AD' }}>
        💰 {reward.points_cost} แต้ม
      </div>
      {reward.stock > 0 && (
        <div style={styles.stockBadge}>เหลือ {reward.stock}</div>
      )}
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
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.3rem', color: 'white',
  },
  pointsChip: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.2)', borderRadius: 20,
    padding: '6px 14px', backdropFilter: 'blur(8px)',
  },
  pointsNum: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.9rem', color: 'white',
  },
  filterWrap: {
    display: 'flex', gap: 8, padding: '16px',
    overflowX: 'auto', scrollbarWidth: 'none',
  },
  filterBtn: {
    flexShrink: 0, padding: '8px 16px', borderRadius: 20,
    background: 'white', border: '2px solid #E8E8EF',
    fontSize: '0.8rem', fontWeight: 600, color: '#6E6E88',
    cursor: 'pointer', fontFamily: 'Noto Sans Thai, sans-serif',
    transition: 'all 0.2s',
  },
  filterActive: {
    background: 'linear-gradient(135deg, #6C3AF7, #4519C9)',
    border: '2px solid transparent', color: 'white',
    boxShadow: '0 4px 12px rgba(108,58,247,0.3)',
  },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 12, padding: '0 16px',
  },
  rewardCard: {
    background: 'white', borderRadius: 16, padding: '16px 12px',
    border: '2px solid transparent',
    boxShadow: '0 2px 12px rgba(108,58,247,0.08)',
    cursor: 'pointer', textAlign: 'center',
    transition: 'all 0.2s',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    animation: 'fadeIn 0.3s ease',
  },
  rewardCardDimmed: { opacity: 0.6 },
  rewardEmoji: { fontSize: '2.5rem' },
  rewardTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.85rem', color: '#1A1A2E', lineHeight: 1.3,
  },
  catBadge: {
    fontSize: '0.65rem', color: '#9898AD', background: '#F4F4F6',
    borderRadius: 10, padding: '2px 8px',
  },
  rewardCost: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '0.95rem',
  },
  stockBadge: {
    fontSize: '0.65rem', color: '#FF6B6B', background: '#FFE5E5',
    borderRadius: 10, padding: '2px 8px',
  },
  modalTitle: {
    fontFamily: 'Sora, sans-serif', fontWeight: 800,
    fontSize: '1.3rem', color: '#1A1A2E', marginBottom: 8,
  },
  modalDesc: {
    fontSize: '0.85rem', color: '#6E6E88',
  },
  costRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid #F4F4F6',
  },
  costLabel: { fontSize: '0.88rem', color: '#6E6E88' },
  costValue: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.95rem', color: '#1A1A2E',
  },
  notEnough: {
    background: '#FFE5E5', color: '#C53030',
    borderRadius: 10, padding: '10px 14px',
    fontSize: '0.82rem', fontWeight: 600,
    textAlign: 'center', marginTop: 10,
  },
}
