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
  const [myRedemptions, setMyRedemptions] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchRewards(); fetchMyRedemptions() }, [])

  async function fetchMyRedemptions() {
    const { data } = await supabase
      .from('redemptions')
      .select('reward_id, status')
      .eq('student_id', profile.id)
      .in('status', ['pending', 'approved'])
    setMyRedemptions((data || []).filter(Boolean))
  }

  async function fetchRewards() {
    const [rewardsRes, redemptionsRes] = await Promise.all([
      supabase.from('rewards').select('*').eq('is_active', true).order('points_cost'),
      supabase.from('redemptions').select('reward_id, status').eq('student_id', profile.id).eq('status', 'approved'),
    ])
    setRewards(rewardsRes.data || [])
    setMyRedemptions((redemptionsRes.data || []).map(r => r.reward_id))
    setLoading(false)
  }

  async function handleRedeem() {
    if (!selected) return
    if (profile.points < selected.points_cost) {
      showToast('แต้มไม่พอ 😢', 'error')
      return
    }
    if (myRedemptions.includes(selected.id)) {
      showToast('แลกของนี้ไปแล้ว', 'error')
      setSelected(null)
      return
    }
    setConfirming(true)
    try {
      // Create redemption record only - points deducted when teacher approves
      const { error: redError } = await supabase.from('redemptions').insert({
        student_id: profile.id,
        reward_id: selected.id,
        points_spent: selected.points_cost,
        status: 'pending',
      })
      if (redError) throw redError

      showToast(`ส่งคำขอแลก "${selected.title}" แล้ว! รอครูอนุมัติ 🎉`, 'success')
      setSelected(null)
      await refreshProfile()
      fetchRewards()
      fetchMyRedemptions()
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
          filtered.map(reward => {
            const myRed = myRedemptions.find(r => r && r.reward_id === reward.id)
            return (
              <RewardCard
                key={reward.id}
                reward={reward}
                canAfford={profile?.points >= reward.points_cost}
                onSelect={() => {
                  const myRed2 = myRedemptions.find(r => r && r.reward_id === reward.id)
                  if (!myRed2) setSelected(reward)
                }}
                redemptionStatus={myRed?.status}
              />
            )
          })
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

function RewardCard({ reward, canAfford, alreadyRedeemed, onSelect }) {
  return (
    <div
      style={{ ...styles.rewardCard, ...(canAfford && !alreadyRedeemed ? {} : styles.rewardCardDimmed) }}
      onClick={alreadyRedeemed ? undefined : onSelect}
    >
      <div style={styles.rewardEmoji}>{reward.image_emoji}</div>
      <div style={styles.rewardTitle}>{reward.title}</div>
      <div style={styles.catBadge}>{CATEGORY_LABELS[reward.category]}</div>
      <div style={{ ...styles.rewardCost, color: canAfford ? '#6C3AF7' : '#9898AD' }}>
        💰 {reward.points_cost} แต้ม
      </div>
      {alreadyRedeemed ? (
        <div style={{ ...styles.stockBadge, background: '#D0FFF4', color: '#007A5A' }}>✅ แลกแล้ว</div>
      ) : reward.stock > 0 ? (
        <div style={styles.stockBadge}>เหลือ {reward.stock}</div>
      ) : null}
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
  pendingBadge: {
    fontSize: '0.65rem', color: '#8a6500', background: '#FFF9E0',
    borderRadius: 10, padding: '3px 8px', fontWeight: 700,
  },
  approvedBadge: {
    fontSize: '0.65rem', color: '#007A5A', background: '#D0FFF4',
    borderRadius: 10, padding: '3px 8px', fontWeight: 700,
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