// Pure CSS GPU-composited top-down highway & moving cars animation for the hero section.
// Zero client JS overhead; respects prefers-reduced-motion automatically.

type CarVariant = 'sedan-gold' | 'suv-copper' | 'sedan-pearl' | 'sedan-bronze'

const PALETTES: Record<
  CarVariant,
  { bodyTop: string; bodyMid: string; bodyBot: string; roof: string; rim: string }
> = {
  'sedan-gold': {
    bodyTop: '#e3c382',
    bodyMid: '#c4964b',
    bodyBot: '#8b6327',
    roof: '#d2a95f',
    rim: 'rgba(255, 240, 206, 0.55)',
  },
  'suv-copper': {
    bodyTop: '#d47c34',
    bodyMid: '#a05516',
    bodyBot: '#6b320d',
    roof: '#b3611d',
    rim: 'rgba(255, 214, 170, 0.45)',
  },
  'sedan-pearl': {
    bodyTop: '#f6efe2',
    bodyMid: '#dfd2bc',
    bodyBot: '#a7967f',
    roof: '#ece2cf',
    rim: 'rgba(255, 255, 255, 0.65)',
  },
  'sedan-bronze': {
    bodyTop: '#8c745c',
    bodyMid: '#5c4a3a',
    bodyBot: '#382c22',
    roof: '#6b5644',
    rim: 'rgba(227, 195, 130, 0.42)',
  },
}

function TopDownCar({ variant, isSuv = false }: { variant: CarVariant; isSuv?: boolean }) {
  const c = PALETTES[variant]
  const id = `car-${variant}`

  if (isSuv) {
    return (
      <svg className="road-car-svg is-suv" viewBox="0 0 88 220" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-body`} x1="44" y1="68" x2="44" y2="204" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={c.bodyTop} />
            <stop offset="52%" stopColor={c.bodyMid} />
            <stop offset="100%" stopColor={c.bodyBot} />
          </linearGradient>
          <linearGradient id={`${id}-beam`} x1="44" y1="74" x2="44" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffe5ad" stopOpacity="0.42" />
            <stop offset="55%" stopColor="#e8b861" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#e8b861" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-tail-l`} cx="0.5" cy="0.3" r="0.65">
            <stop offset="0%" stopColor="#ff5340" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ff5340" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft volumetric headlight beam cones */}
        <path d="M22 72L6 4H42L35 72Z" fill={`url(#${id}-beam)`} />
        <path d="M53 72L46 4H82L66 72Z" fill={`url(#${id}-beam)`} />
        <path d="M22 72L14 14H74L66 72Z" fill={`url(#${id}-beam)`} opacity="0.35" />

        {/* Soft atmospheric rear taillight halos */}
        <ellipse cx="29" cy="203" rx="14" ry="9" fill={`url(#${id}-tail-l)`} />
        <ellipse cx="59" cy="203" rx="14" ry="9" fill={`url(#${id}-tail-l)`} />

        {/* Ground shadow */}
        <rect x="14" y="68" width="60" height="138" rx="18" fill="#090706" fillOpacity="0.58" />

        {/* Tires */}
        <rect x="14" y="86" width="5" height="22" rx="2.5" fill="#120e0c" />
        <rect x="69" y="86" width="5" height="22" rx="2.5" fill="#120e0c" />
        <rect x="14" y="164" width="5" height="24" rx="2.5" fill="#120e0c" />
        <rect x="69" y="164" width="5" height="24" rx="2.5" fill="#120e0c" />

        {/* Side mirrors */}
        <path d="M18 106L11 110C10.4 110.4 10.6 113 12 113.5L18 113Z" fill={c.bodyTop} />
        <path d="M70 106L77 110C77.6 110.4 77.4 113 76 113.5L70 113Z" fill={c.bodyTop} />

        {/* SUV main body */}
        <rect
          x="17"
          y="68"
          width="54"
          height="134"
          rx="15"
          fill={`url(#${id}-body)`}
          stroke={c.rim}
          strokeWidth="1.2"
        />

        {/* Hood creases */}
        <path d="M28 73L30 98M60 73L58 98" stroke="#fff" strokeOpacity="0.2" strokeWidth="1" strokeLinecap="round" />

        {/* Front windshield */}
        <path d="M23 102C28 96 60 96 65 102L62 118C54 116 34 116 26 118L23 102Z" fill="#181310" />
        <path d="M28 101L35 115" stroke="#fff" strokeOpacity="0.16" strokeWidth="2" strokeLinecap="round" />

        {/* SUV elongated roof + panoramic sunroof + rails */}
        <rect x="24" y="120" width="40" height="62" rx="7" fill={c.roof} />
        <rect x="29" y="128" width="30" height="34" rx="5" fill="#1b1512" fillOpacity="0.82" />
        <line x1="25.5" y1="124" x2="25.5" y2="178" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="62.5" y1="124" x2="62.5" y2="178" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.2" strokeLinecap="round" />

        {/* Rear window */}
        <path d="M26 184C34 185.5 54 185.5 62 184L64 194C54 196.5 34 196.5 24 194L26 184Z" fill="#181310" />

        {/* Headlights */}
        <rect x="21" y="70" width="12" height="3.8" rx="1.9" fill="#fff3d1" />
        <rect x="55" y="70" width="12" height="3.8" rx="1.9" fill="#fff3d1" />

        {/* Rear LED light bar */}
        <rect x="22" y="198.5" width="14" height="3" rx="1.5" fill="#ff5a47" />
        <rect x="52" y="198.5" width="14" height="3" rx="1.5" fill="#ff5a47" />
        <rect x="37" y="199.3" width="14" height="1.5" rx="0.75" fill="#ff5a47" fillOpacity="0.6" />
      </svg>
    )
  }

  return (
    <svg className="road-car-svg" viewBox="0 0 84 210" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="42" y1="68" x2="42" y2="194" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c.bodyTop} />
          <stop offset="50%" stopColor={c.bodyMid} />
          <stop offset="100%" stopColor={c.bodyBot} />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="42" y1="74" x2="42" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffe5ad" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#e8b861" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#e8b861" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-tail-l`} cx="0.5" cy="0.3" r="0.65">
          <stop offset="0%" stopColor="#ff5340" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#ff5340" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft volumetric headlight beam cones */}
      <path d="M24 73L8 6H40L34 73Z" fill={`url(#${id}-beam)`} />
      <path d="M50 73L44 6H76L60 73Z" fill={`url(#${id}-beam)`} />
      <path d="M24 73L16 16H68L60 73Z" fill={`url(#${id}-beam)`} opacity="0.35" />

      {/* Soft atmospheric rear taillight halos */}
      <ellipse cx="29" cy="193" rx="13" ry="8.5" fill={`url(#${id}-tail-l)`} />
      <ellipse cx="55" cy="193" rx="13" ry="8.5" fill={`url(#${id}-tail-l)`} />

      {/* Ground shadow */}
      <rect x="15" y="70" width="54" height="127" rx="18" fill="#090706" fillOpacity="0.55" />

      {/* Tires */}
      <rect x="15" y="88" width="4.5" height="20" rx="2.2" fill="#120e0c" />
      <rect x="64.5" y="88" width="4.5" height="20" rx="2.2" fill="#120e0c" />
      <rect x="15" y="156" width="4.5" height="21" rx="2.2" fill="#120e0c" />
      <rect x="64.5" y="156" width="4.5" height="21" rx="2.2" fill="#120e0c" />

      {/* Side mirrors */}
      <path d="M19 107L12.5 111C12 111.4 12.2 113.8 13.5 114.2L19 113.5Z" fill={c.bodyTop} />
      <path d="M65 107L71.5 111C72 111.4 71.8 113.8 70.5 114.2L65 113.5Z" fill={c.bodyTop} />

      {/* Sleek sedan body */}
      <rect
        x="18"
        y="69"
        width="48"
        height="124"
        rx="17"
        fill={`url(#${id}-body)`}
        stroke={c.rim}
        strokeWidth="1.2"
      />

      {/* Sculpted hood lines */}
      <path d="M29 74L31 101M55 74L53 101" stroke="#fff" strokeOpacity="0.22" strokeWidth="1" strokeLinecap="round" />

      {/* Front windshield */}
      <path d="M23 106C28 99 56 99 61 106L58 122C51 120 33 120 26 122L23 106Z" fill="#181310" />
      <path d="M28 105L34 119" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />

      {/* Cabin roof */}
      <rect x="25.5" y="124" width="33" height="36" rx="8" fill={c.roof} />
      <rect x="30" y="130" width="24" height="16" rx="4" fill="#1b1512" fillOpacity="0.7" />

      {/* Rear windshield */}
      <path d="M26 162C33 164 51 164 58 162L60.5 177C52 180 32 180 23.5 177L26 162Z" fill="#181310" />

      {/* Headlights */}
      <path d="M23 73.5C25.5 71 29.5 70.5 33 71.2L32 74.5L23 73.5Z" fill="#fff3d1" />
      <path d="M61 73.5C58.5 71 54.5 70.5 51 71.2L52 74.5L61 73.5Z" fill="#fff3d1" />

      {/* Taillights */}
      <rect x="23" y="189.2" width="12" height="2.8" rx="1.4" fill="#ff5a47" />
      <rect x="49" y="189.2" width="12" height="2.8" rx="1.4" fill="#ff5a47" />
    </svg>
  )
}

export default function HeroRoad() {
  return (
    <div className="road" aria-hidden="true">
      {/* GPU-accelerated moving center highway dashes */}
      <div className="road-dashes" />

      {/* Left lane: smooth oncoming traffic (driving down) */}
      <div className="road-lane road-lane-left">
        <div className="road-car car-down car-d1">
          <TopDownCar variant="sedan-gold" />
        </div>
        <div className="road-car car-down car-d2">
          <TopDownCar variant="sedan-bronze" />
        </div>
      </div>

      {/* Right lane: smooth forward traffic (driving up) */}
      <div className="road-lane road-lane-right">
        <div className="road-car car-up car-u1">
          <TopDownCar variant="sedan-pearl" />
        </div>
        <div className="road-car car-up car-u2">
          <TopDownCar variant="suv-copper" isSuv />
        </div>
      </div>
    </div>
  )
}
