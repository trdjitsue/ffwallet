// Avatar options
export const SKIN_COLORS = ['#FDDBB4', '#F5C08A', '#E8956D', '#C67C52', '#8D5524', '#4A2912']
export const HAIR_COLORS = ['#1A1A1A', '#4A3728', '#8B5E3C', '#C49A6C', '#F4D03F', '#E74C3C', '#9B59B6', '#FFFFFF']

export const HATS = [
  { id: 'none', label: 'ไม่มี', svg: null },
  { id: 'cap', label: 'หมวกแก๊ป', svg: (color) => (
    <g>
      <ellipse cx="60" cy="38" rx="28" ry="8" fill={color} />
      <rect x="32" y="22" width="56" height="18" rx="8" fill={color} />
      <ellipse cx="60" cy="22" rx="20" ry="6" fill={color} />
      <rect x="32" y="36" width="36" height="4" rx="2" fill={color} opacity="0.6" />
    </g>
  )},
  { id: 'wizard', label: 'หมวกพ่อมด', svg: (color) => (
    <g>
      <polygon points="60,2 40,40 80,40" fill={color} />
      <ellipse cx="60" cy="40" rx="24" ry="6" fill={color} />
      <ellipse cx="60" cy="40" rx="24" ry="6" fill="none" stroke="#FFD700" strokeWidth="2" />
      <circle cx="60" cy="18" r="4" fill="#FFD700" opacity="0.8" />
    </g>
  )},
  { id: 'crown', label: 'มงกุฎ', svg: (color) => (
    <g>
      <rect x="38" y="32" width="44" height="12" rx="2" fill={color} />
      <polygon points="38,32 38,18 49,28 60,14 71,28 82,18 82,32" fill={color} />
      <circle cx="60" cy="16" r="3" fill="#FF4444" />
      <circle cx="47" cy="28" r="2.5" fill="#4444FF" />
      <circle cx="73" cy="28" r="2.5" fill="#44FF44" />
    </g>
  )},
  { id: 'beanie', label: 'หมวกไหมพรม', svg: (color) => (
    <g>
      <rect x="35" y="24" width="50" height="20" rx="4" fill={color} />
      <ellipse cx="60" cy="24" rx="25" ry="10" fill={color} />
      <circle cx="60" cy="14" r="6" fill={color} />
      <rect x="35" y="36" width="50" height="5" rx="2" fill="#00000020" />
      <rect x="35" y="28" width="50" height="4" rx="0" fill="#00000015" />
    </g>
  )},
  { id: 'halo', label: 'เฮโล', svg: (color) => (
    <g>
      <ellipse cx="60" cy="20" rx="22" ry="6" fill="none" stroke={color} strokeWidth="5" />
      <line x1="48" y1="22" x2="52" y2="30" stroke={color} strokeWidth="3" opacity="0.5" />
      <line x1="72" y1="22" x2="68" y2="30" stroke={color} strokeWidth="3" opacity="0.5" />
    </g>
  )},
]

export const GLASSES = [
  { id: 'none', label: 'ไม่มี', svg: null },
  { id: 'round', label: 'กลม', svg: (color) => (
    <g>
      <circle cx="48" cy="68" r="9" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx="72" cy="68" r="9" fill="none" stroke={color} strokeWidth="2.5" />
      <line x1="57" y1="68" x2="63" y2="68" stroke={color} strokeWidth="2" />
      <line x1="30" y1="66" x2="39" y2="68" stroke={color} strokeWidth="2" />
      <line x1="90" y1="66" x2="81" y2="68" stroke={color} strokeWidth="2" />
    </g>
  )},
  { id: 'square', label: 'เหลี่ยม', svg: (color) => (
    <g>
      <rect x="38" y="61" width="19" height="14" rx="3" fill="none" stroke={color} strokeWidth="2.5" />
      <rect x="62" y="61" width="19" height="14" rx="3" fill="none" stroke={color} strokeWidth="2.5" />
      <line x1="57" y1="68" x2="62" y2="68" stroke={color} strokeWidth="2" />
      <line x1="30" y1="66" x2="38" y2="68" stroke={color} strokeWidth="2" />
      <line x1="90" y1="66" x2="81" y2="68" stroke={color} strokeWidth="2" />
    </g>
  )},
  { id: 'sun', label: 'แว่นกันแดด', svg: (color) => (
    <g>
      <circle cx="48" cy="68" r="10" fill={color} opacity="0.85" />
      <circle cx="72" cy="68" r="10" fill={color} opacity="0.85" />
      <line x1="58" y1="68" x2="62" y2="68" stroke={color} strokeWidth="2.5" />
      <line x1="29" y1="65" x2="38" y2="68" stroke={color} strokeWidth="2.5" />
      <line x1="91" y1="65" x2="82" y2="68" stroke={color} strokeWidth="2.5" />
    </g>
  )},
  { id: 'star', label: 'ดาว', svg: (color) => (
    <g>
      {'⭐'.length > 0 && <>
        <polygon points="48,59 50,65 57,65 51,69 53,76 48,72 43,76 45,69 39,65 46,65" fill={color} />
        <polygon points="72,59 74,65 81,65 75,69 77,76 72,72 67,76 69,69 63,65 70,65" fill={color} />
      </>}
    </g>
  )},
]

export const MOUTHS = [
  { id: 'smile', label: 'ยิ้ม', svg: () => (
    <path d="M 46 84 Q 60 96 74 84" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
  )},
  { id: 'big-smile', label: 'ยิ้มกว้าง', svg: () => (
    <g>
      <path d="M 44 82 Q 60 98 76 82" fill="#FF6B6B" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 44 82 Q 60 98 76 82" fill="none" stroke="#333" strokeWidth="2.5" />
    </g>
  )},
  { id: 'neutral', label: 'ปกติ', svg: () => (
    <line x1="48" y1="87" x2="72" y2="87" stroke="#333" strokeWidth="3" strokeLinecap="round" />
  )},
  { id: 'smirk', label: 'ยิ้มข้างเดียว', svg: () => (
    <path d="M 50 86 Q 62 94 72 84" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
  )},
  { id: 'tongue', label: 'แลบลิ้น', svg: () => (
    <g>
      <path d="M 46 84 Q 60 96 74 84" fill="#FF6B6B" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="60" cy="93" rx="7" ry="5" fill="#FF8FAB" stroke="#FF6B6B" strokeWidth="1.5" />
    </g>
  )},
  { id: 'ooh', label: 'ปากเป๋อ', svg: () => (
    <ellipse cx="60" cy="88" rx="8" ry="6" fill="#333" />
  )},
]

// The SVG Avatar component
export function AvatarSVG({ config, size = 120 }) {
  const { skinColor, hairColor, hatId, hatColor, glassesId, glassesColor, mouthId } = config

  const hat = HATS.find(h => h.id === hatId) || HATS[0]
  const glasses = GLASSES.find(g => g.id === glassesId) || GLASSES[0]
  const mouth = MOUTHS.find(m => m.id === mouthId) || MOUTHS[0]

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      {/* Hat (behind head) */}
      {hat.svg && hat.svg(hatColor || '#6C3AF7')}

      {/* Head */}
      <ellipse cx="60" cy="72" rx="30" ry="32" fill={skinColor || '#FDDBB4'} />

      {/* Hair */}
      <ellipse cx="60" cy="50" rx="30" ry="14" fill={hairColor || '#1A1A1A'} />
      <rect x="30" y="50" width="60" height="10" fill={hairColor || '#1A1A1A'} />

      {/* Eyes */}
      <circle cx="48" cy="68" r="4" fill="white" />
      <circle cx="72" cy="68" r="4" fill="white" />
      <circle cx="48" cy="68" r="2.5" fill="#1A1A2E" />
      <circle cx="72" cy="68" r="2.5" fill="#1A1A2E" />
      <circle cx="49" cy="67" r="1" fill="white" />
      <circle cx="73" cy="67" r="1" fill="white" />

      {/* Nose */}
      <ellipse cx="60" cy="78" rx="3" ry="2" fill={skinColor || '#FDDBB4'} stroke="#00000020" strokeWidth="1" />

      {/* Mouth */}
      {mouth.svg && mouth.svg()}

      {/* Glasses (on top of eyes) */}
      {glasses.svg && glasses.svg(glassesColor || '#1A1A2E')}

      {/* Cheeks */}
      <ellipse cx="38" cy="80" rx="7" ry="4" fill="#FF9999" opacity="0.35" />
      <ellipse cx="82" cy="80" rx="7" ry="4" fill="#FF9999" opacity="0.35" />
    </svg>
  )
}

export const DEFAULT_AVATAR = {
  skinColor: '#FDDBB4',
  hairColor: '#1A1A1A',
  hatId: 'none',
  hatColor: '#6C3AF7',
  glassesId: 'none',
  glassesColor: '#1A1A2E',
  mouthId: 'smile',
}

// Avatar Builder UI Component
export function AvatarBuilderUI({ config, onChange }) {
  const update = (key, val) => onChange({ ...config, [key]: val })

  return (
    <div style={uiStyles.wrap}>
      {/* Preview */}
      <div style={uiStyles.preview}>
        <AvatarSVG config={config} size={100} />
      </div>

      {/* Skin Color */}
      <Section label="สีผิว">
        <ColorRow colors={SKIN_COLORS} selected={config.skinColor} onSelect={c => update('skinColor', c)} />
      </Section>

      {/* Hair Color */}
      <Section label="สีผม">
        <ColorRow colors={HAIR_COLORS} selected={config.hairColor} onSelect={c => update('hairColor', c)} />
      </Section>

      {/* Hat */}
      <Section label="หมวก">
        <OptionRow
          options={HATS}
          selected={config.hatId}
          onSelect={id => update('hatId', id)}
          config={config}
          type="hat"
        />
        {config.hatId !== 'none' && (
          <div style={{ marginTop: 8 }}>
            <div style={uiStyles.subLabel}>สีหมวก</div>
            <ColorRow
              colors={['#6C3AF7','#FF6B6B','#F5C842','#00D9A3','#1A1A2E','#FFFFFF','#FF8E53','#4ECDC4']}
              selected={config.hatColor}
              onSelect={c => update('hatColor', c)}
            />
          </div>
        )}
      </Section>

      {/* Glasses */}
      <Section label="แว่นตา">
        <OptionRow
          options={GLASSES}
          selected={config.glassesId}
          onSelect={id => update('glassesId', id)}
          config={config}
          type="glasses"
        />
        {config.glassesId !== 'none' && (
          <div style={{ marginTop: 8 }}>
            <div style={uiStyles.subLabel}>สีแว่น</div>
            <ColorRow
              colors={['#1A1A2E','#6C3AF7','#FF6B6B','#F5C842','#00D9A3','#FF8E53','#C0C0C0','#8B4513']}
              selected={config.glassesColor}
              onSelect={c => update('glassesColor', c)}
            />
          </div>
        )}
      </Section>

      {/* Mouth */}
      <Section label="ปาก">
        <div style={uiStyles.mouthRow}>
          {MOUTHS.map(m => (
            <button
              key={m.id}
              onClick={() => update('mouthId', m.id)}
              style={{ ...uiStyles.mouthBtn, ...(config.mouthId === m.id ? uiStyles.mouthActive : {}) }}
            >
              <svg width="36" height="20" viewBox="40 78 40 20">
                {m.svg && m.svg()}
              </svg>
              <span style={{ fontSize: '0.6rem', color: config.mouthId === m.id ? '#6C3AF7' : '#9898AD' }}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={uiStyles.section}>
      <div style={uiStyles.label}>{label}</div>
      {children}
    </div>
  )
}

function ColorRow({ colors, selected, onSelect }) {
  return (
    <div style={uiStyles.colorRow}>
      {colors.map(c => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          style={{
            width: 28, height: 28, borderRadius: '50%', background: c,
            border: selected === c ? '3px solid #6C3AF7' : '2px solid #E8E8EF',
            boxShadow: selected === c ? `0 0 0 2px white, 0 0 0 4px #6C3AF7` : 'none',
            cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

function OptionRow({ options, selected, onSelect, config, type }) {
  return (
    <div style={uiStyles.optionRow}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          style={{ ...uiStyles.optionBtn, ...(selected === opt.id ? uiStyles.optionActive : {}) }}
        >
          {opt.id === 'none' ? (
            <span style={{ fontSize: '1.1rem' }}>✕</span>
          ) : (
            <svg width="36" height="36" viewBox="30 8 60 40">
              {type === 'hat' && opt.svg && opt.svg(config.hatColor || '#6C3AF7')}
              {type === 'glasses' && opt.svg && opt.svg(config.glassesColor || '#1A1A2E')}
            </svg>
          )}
          <span style={{ fontSize: '0.58rem', color: selected === opt.id ? '#6C3AF7' : '#9898AD', marginTop: 2 }}>
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  )
}

const uiStyles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  preview: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    padding: '12px',
    background: 'linear-gradient(135deg, #F5F0FF, #EDE5FF)',
    borderRadius: 16,
  },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: {
    fontFamily: 'Sora, sans-serif', fontWeight: 700,
    fontSize: '0.78rem', color: '#6E6E88',
    letterSpacing: '0.05em', textTransform: 'uppercase',
  },
  subLabel: {
    fontFamily: 'Sora, sans-serif', fontWeight: 600,
    fontSize: '0.72rem', color: '#9898AD', marginBottom: 6,
  },
  colorRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  optionRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: 52, height: 52, borderRadius: 12,
    background: 'white', border: '2px solid #E8E8EF',
    cursor: 'pointer', transition: 'all 0.15s', gap: 2,
    padding: '4px 2px',
  },
  optionActive: {
    border: '2px solid #6C3AF7',
    background: '#F0EBFF',
    boxShadow: '0 2px 8px rgba(108,58,247,0.2)',
  },
  mouthRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  mouthBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: 56, height: 48, borderRadius: 12,
    background: 'white', border: '2px solid #E8E8EF',
    cursor: 'pointer', transition: 'all 0.15s', gap: 2,
  },
  mouthActive: {
    border: '2px solid #6C3AF7', background: '#F0EBFF',
    boxShadow: '0 2px 8px rgba(108,58,247,0.2)',
  },
}