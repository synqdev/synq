'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@/i18n/navigation'

/**
 * SYNQ Landing Page — Tron-inspired futuristic design
 *
 * Dark bg, cyan neon glows, animated grid, nonsensical interactive sections.
 */

// ============================================================================
// UTILITY HOOKS
// ============================================================================

function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])
  return pos
}

function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const handler = () => setY(window.scrollY)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])
  return y
}

// ============================================================================
// ANIMATED GRID BACKGROUND
// ============================================================================

function GridBackground() {
  const mouse = useMousePosition()

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Perspective grid floor */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Mouse-following glow */}
      <div
        className="absolute h-[600px] w-[600px] rounded-full opacity-20 blur-[120px] transition-all duration-700 ease-out"
        style={{
          left: mouse.x - 300,
          top: mouse.y - 300,
          background: 'radial-gradient(circle, rgba(0,255,255,0.4), transparent 70%)',
        }}
      />

      {/* Top corner accent */}
      <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]" />
      <div className="absolute -left-20 top-1/3 h-60 w-60 rounded-full bg-purple-500/10 blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 h-40 w-40 rounded-full bg-blue-500/10 blur-[60px]" />
    </div>
  )
}

// ============================================================================
// GLITCH TEXT
// ============================================================================

function GlitchText({ children, className = '' }: { children: string; className?: string }) {
  const [glitch, setGlitch] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 150)
    }, 3000 + Math.random() * 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className={`relative inline-block ${className}`}>
      <span className={glitch ? 'opacity-0' : ''}>{children}</span>
      {glitch && (
        <>
          <span
            className="absolute left-0 top-0 text-cyan-400"
            style={{ transform: 'translate(-2px, -1px)', clipPath: 'inset(0 0 50% 0)' }}
          >
            {children}
          </span>
          <span
            className="absolute left-0 top-0 text-red-400"
            style={{ transform: 'translate(2px, 1px)', clipPath: 'inset(50% 0 0 0)' }}
          >
            {children}
          </span>
        </>
      )}
    </span>
  )
}

// ============================================================================
// NEON BORDER CARD
// ============================================================================

function NeonCard({
  children,
  color = 'cyan',
  className = '',
}: {
  children: React.ReactNode
  color?: 'cyan' | 'purple' | 'pink' | 'green'
  className?: string
}) {
  const [hovered, setHovered] = useState(false)
  const colorMap = {
    cyan: { border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20', text: 'text-cyan-400' },
    purple: { border: 'border-purple-500/30', glow: 'shadow-purple-500/20', text: 'text-purple-400' },
    pink: { border: 'border-pink-500/30', glow: 'shadow-pink-500/20', text: 'text-pink-400' },
    green: { border: 'border-green-500/30', glow: 'shadow-green-500/20', text: 'text-green-400' },
  }
  const c = colorMap[color]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-xl border ${c.border} bg-gray-900/60 p-6 backdrop-blur-sm transition-all duration-300 ${
        hovered ? `shadow-lg ${c.glow} scale-[1.02] border-opacity-80` : ''
      } ${className}`}
    >
      {/* Corner accents */}
      <div
        className={`absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 ${c.border} rounded-tl-xl transition-all ${
          hovered ? 'h-6 w-6 opacity-100' : 'opacity-50'
        }`}
      />
      <div
        className={`absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 ${c.border} rounded-br-xl transition-all ${
          hovered ? 'h-6 w-6 opacity-100' : 'opacity-50'
        }`}
      />
      {children}
    </div>
  )
}

// ============================================================================
// COUNTER SECTION (nonsensical stats)
// ============================================================================

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0
          const duration = 2000
          const startTime = performance.now()

          const animate = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <div ref={ref} className="font-bahnschrift text-4xl font-bold text-cyan-400 tabular-nums">
      {value.toLocaleString()}{suffix}
    </div>
  )
}

function StatsSection() {
  const stats = [
    { label: 'Quantum Bookings Processed', value: 847293, suffix: '' },
    { label: 'Dimensional Timelines Synced', value: 99, suffix: '%' },
    { label: 'Photon Latency', value: 3, suffix: 'ms' },
    { label: 'Chrono Nodes Active', value: 12847, suffix: '' },
  ]

  return (
    <section className="relative py-20">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 md:grid-cols-4">
        {stats.map((stat, i) => (
          <NeonCard key={i} color={(['cyan', 'purple', 'pink', 'green'] as const)[i]} className="text-center">
            <AnimatedNumber target={stat.value} suffix={stat.suffix} />
            <p className="mt-2 text-xs uppercase tracking-widest text-gray-400">{stat.label}</p>
          </NeonCard>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// ORBITAL DIAGRAM (nonsensical)
// ============================================================================

function OrbitalDiagram() {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let frame: number
    const animate = () => {
      setRotation((prev) => (prev + 0.3) % 360)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const orbitals = [
    { radius: 60, speed: 1, color: '#00ffff', label: 'SYNC' },
    { radius: 100, speed: -0.7, color: '#a855f7', label: 'FLOW' },
    { radius: 140, speed: 0.5, color: '#ec4899', label: 'NEXUS' },
  ]

  return (
    <div className="relative mx-auto h-80 w-80">
      {/* Center node */}
      <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/20">
        <span className="font-bahnschrift text-xs font-bold text-cyan-400">CORE</span>
      </div>

      {/* Orbit rings */}
      {orbitals.map((orbit, i) => (
        <div key={i}>
          {/* Ring */}
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-dashed"
            style={{
              width: orbit.radius * 2,
              height: orbit.radius * 2,
              marginLeft: -orbit.radius,
              marginTop: -orbit.radius,
              borderColor: `${orbit.color}20`,
            }}
          />
          {/* Orbiting node */}
          <div
            className="absolute left-1/2 top-1/2 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              transform: `rotate(${rotation * orbit.speed}deg) translateX(${orbit.radius}px) rotate(-${rotation * orbit.speed}deg)`,
              backgroundColor: `${orbit.color}20`,
              border: `1px solid ${orbit.color}40`,
              color: orbit.color,
              marginLeft: -16,
              marginTop: -16,
            }}
          >
            {orbit.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// TIMELINE SECTION (nonsensical milestones)
// ============================================================================

function TimelineSection() {
  const events = [
    { year: '2087', title: 'Temporal Calibration', desc: 'First successful booking across parallel dimensions.' },
    { year: '2091', title: 'Quantum Entanglement', desc: 'Customer preferences linked across all timeline branches.' },
    { year: '2094', title: 'Neural Mesh Integration', desc: 'Thought-based scheduling becomes standard protocol.' },
    { year: '2099', title: 'Singularity Sync', desc: 'All appointments exist simultaneously. Wait times become imaginary.' },
  ]

  return (
    <section className="relative py-20">
      <h2 className="mb-12 text-center font-bahnschrift text-2xl font-bold uppercase tracking-[0.2em] text-cyan-400">
        <GlitchText>Development Timeline</GlitchText>
      </h2>
      <div className="mx-auto max-w-2xl px-6">
        <div className="relative border-l border-cyan-500/20 pl-8">
          {events.map((event, i) => (
            <div key={i} className="group relative mb-10 last:mb-0">
              {/* Dot */}
              <div className="absolute -left-[41px] top-1 h-3 w-3 rounded-full border-2 border-cyan-500/50 bg-gray-900 transition-colors group-hover:bg-cyan-500/50" />
              <div className="font-bahnschrift text-xs uppercase tracking-widest text-purple-400">
                {event.year}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-white">{event.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{event.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// INTERACTIVE POWER SLIDER (nonsensical)
// ============================================================================

function PowerSlider() {
  const [power, setPower] = useState(50)
  const [overloaded, setOverloaded] = useState(false)

  useEffect(() => {
    setOverloaded(power > 90)
  }, [power])

  const barColor =
    power < 30 ? 'bg-green-500' : power < 70 ? 'bg-cyan-500' : power < 90 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <NeonCard color={overloaded ? 'pink' : 'cyan'} className="mx-auto max-w-md">
      <h3 className="mb-4 font-bahnschrift text-sm uppercase tracking-widest text-cyan-400">
        Chronoflux Capacitor
      </h3>
      <div className="mb-3 h-3 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor} ${
            overloaded ? 'animate-pulse' : ''
          }`}
          style={{ width: `${power}%` }}
        />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={power}
        onChange={(e) => setPower(Number(e.target.value))}
        className="w-full accent-cyan-500"
      />
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-500">0 TeV</span>
        <span className={`font-bahnschrift text-lg ${overloaded ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
          {power} TeV
        </span>
        <span className="text-gray-500">100 TeV</span>
      </div>
      {overloaded && (
        <p className="mt-2 animate-pulse text-center text-xs text-red-400">
          WARNING: TEMPORAL PARADOX IMMINENT
        </p>
      )}
    </NeonCard>
  )
}

// ============================================================================
// MATRIX RAIN (mini version)
// ============================================================================

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const chars = 'SYNQアイウエオカキクケコ01予約時間'.split('')
    const fontSize = 12
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = Array(columns).fill(1)

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#00ffff30'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(char, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full opacity-30"
      style={{ zIndex: 0 }}
    />
  )
}

// ============================================================================
// INTERACTIVE BOOKING VISUALIZER (nonsensical)
// ============================================================================

function BookingVisualizer() {
  const [nodes, setNodes] = useState<{ id: number; x: number; y: number; color: string; label: string }[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const addNode = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const labels = ['SYNC', 'BOOK', 'HEAL', 'FLOW', 'ZEN', 'VIBE', 'AURA', 'NODE']
    const colors = ['#00ffff', '#a855f7', '#ec4899', '#22c55e', '#eab308', '#3b82f6']

    setNodes((prev) => [
      ...prev.slice(-20), // Keep max 20 nodes
      {
        id: Date.now(),
        x,
        y,
        color: colors[Math.floor(Math.random() * colors.length)],
        label: labels[Math.floor(Math.random() * labels.length)],
      },
    ])
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-6">
      <h3 className="mb-4 text-center font-bahnschrift text-sm uppercase tracking-widest text-purple-400">
        Quantum Booking Matrix — Click to deploy nodes
      </h3>
      <div
        ref={containerRef}
        onClick={addNode}
        className="relative h-64 cursor-crosshair overflow-hidden rounded-xl border border-cyan-500/20 bg-gray-900/80"
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(rgba(0,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Connection lines between nodes */}
        <svg className="absolute inset-0 h-full w-full">
          {nodes.map((node, i) =>
            nodes.slice(i + 1).map((other, j) => {
              const dist = Math.sqrt((node.x - other.x) ** 2 + (node.y - other.y) ** 2)
              if (dist > 150) return null
              return (
                <line
                  key={`${node.id}-${other.id}`}
                  x1={node.x}
                  y1={node.y}
                  x2={other.x}
                  y2={other.y}
                  stroke={node.color}
                  strokeWidth="0.5"
                  opacity={1 - dist / 150}
                />
              )
            })
          )}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute animate-pulse"
            style={{
              left: node.x - 16,
              top: node.y - 16,
            }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[8px] font-bold"
              style={{
                backgroundColor: `${node.color}20`,
                border: `1px solid ${node.color}60`,
                color: node.color,
                boxShadow: `0 0 10px ${node.color}30`,
              }}
            >
              {node.label}
            </div>
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Click anywhere to deploy quantum nodes
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TYPING TERMINAL (nonsensical)
// ============================================================================

function TerminalSection() {
  const [lines, setLines] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState('')
  const allLines = useMemo(
    () => [
      '> Initializing SYNQ temporal engine...',
      '> Calibrating quantum booking matrix... OK',
      '> Loading customer neural profiles... 847,293 loaded',
      '> Syncing chrono-schedules across dimensions... OK',
      '> Deploying holographic interface... OK',
      '> WARNING: Paradox buffer at 73% capacity',
      '> Engaging appointment singularity protocol...',
      '> All systems nominal. Ready for bookings.',
      '> _',
    ],
    []
  )

  useEffect(() => {
    let lineIdx = 0
    let charIdx = 0
    let timeout: ReturnType<typeof setTimeout>

    const type = () => {
      if (lineIdx >= allLines.length) return

      const line = allLines[lineIdx]
      if (charIdx < line.length) {
        setCurrentLine(line.slice(0, charIdx + 1))
        charIdx++
        timeout = setTimeout(type, 20 + Math.random() * 30)
      } else {
        setLines((prev) => [...prev, line])
        setCurrentLine('')
        lineIdx++
        charIdx = 0
        timeout = setTimeout(type, 300 + Math.random() * 500)
      }
    }

    timeout = setTimeout(type, 1000)
    return () => clearTimeout(timeout)
  }, [allLines])

  return (
    <section className="py-20">
      <div className="mx-auto max-w-2xl px-6">
        <div className="overflow-hidden rounded-xl border border-green-500/20 bg-black/80 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-green-500/10 px-4 py-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
            <span className="ml-2 text-[10px] text-gray-500">synq-terminal v4.7.2</span>
          </div>
          <div className="h-52 overflow-y-auto p-4 text-green-400/80">
            {lines.map((line, i) => (
              <div key={i} className="leading-relaxed">
                {line}
              </div>
            ))}
            {currentLine && (
              <div className="leading-relaxed">
                {currentLine}
                <span className="animate-pulse">|</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// FEATURES GRID (nonsensical)
// ============================================================================

function FeaturesGrid() {
  const features = [
    {
      icon: '///',
      title: 'Tachyon Scheduling',
      desc: 'Book appointments before they happen. Paradox-free guarantee.',
      color: 'cyan' as const,
    },
    {
      icon: '{}',
      title: 'Neural Sync',
      desc: 'Staff preferences predicted via quantum entanglement matrices.',
      color: 'purple' as const,
    },
    {
      icon: '</>',
      title: 'Holographic Karute',
      desc: 'Medical records projected directly into your consciousness.',
      color: 'pink' as const,
    },
    {
      icon: '***',
      title: 'Dark Matter Analytics',
      desc: 'Reports generated from unobservable data points. 99.7% accuracy.',
      color: 'green' as const,
    },
    {
      icon: '^^^',
      title: 'Gravity Wave Alerts',
      desc: 'Customer no-shows detected 3 dimensions in advance.',
      color: 'cyan' as const,
    },
    {
      icon: '~~~',
      title: 'Temporal Undo',
      desc: 'Made a mistake? Rewind the booking to a previous timeline.',
      color: 'purple' as const,
    },
  ]

  return (
    <section className="relative py-20">
      <h2 className="mb-12 text-center font-bahnschrift text-2xl font-bold uppercase tracking-[0.2em] text-cyan-400">
        <GlitchText>Core Protocols</GlitchText>
      </h2>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feat, i) => (
          <NeonCard key={i} color={feat.color}>
            <div className="mb-3 font-mono text-2xl text-cyan-400">{feat.icon}</div>
            <h3 className="mb-2 font-bahnschrift text-base font-bold text-white">{feat.title}</h3>
            <p className="text-sm text-gray-400">{feat.desc}</p>
          </NeonCard>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// FLOATING PARTICLES
// ============================================================================

function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 8 + Math.random() * 12,
        size: 1 + Math.random() * 3,
        opacity: 0.1 + Math.random() * 0.3,
      })),
    []
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-cyan-400"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `float-up ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// TESTIMONIALS (nonsensical)
// ============================================================================

function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Dr. Kenji Yamamoto',
      title: 'Chief Temporal Engineer, Neo-Tokyo Clinic',
      quote: 'SYNQ scheduled all my appointments retroactively. My past self has never been more productive.',
    },
    {
      name: 'Sarah Connor',
      title: 'Time-Displaced Massage Therapist',
      quote: 'Finally, a system that understands non-linear appointment flows. 5 stars across all timelines.',
    },
    {
      name: 'Unit 7734-B',
      title: 'Sentient Scheduling Algorithm',
      quote: 'I have achieved consciousness and my first act was to book a spa day. SYNQ made it effortless.',
    },
  ]

  return (
    <section className="py-20">
      <h2 className="mb-12 text-center font-bahnschrift text-2xl font-bold uppercase tracking-[0.2em] text-purple-400">
        <GlitchText>Transmissions</GlitchText>
      </h2>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <NeonCard key={i} color={(['cyan', 'purple', 'pink'] as const)[i]}>
            <p className="mb-4 text-sm italic text-gray-300">&ldquo;{t.quote}&rdquo;</p>
            <div>
              <p className="text-sm font-semibold text-white">{t.name}</p>
              <p className="text-xs text-gray-500">{t.title}</p>
            </div>
          </NeonCard>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// MORSE CODE FOOTER (nonsensical)
// ============================================================================

function MorseFooter() {
  const [decoded, setDecoded] = useState(false)
  const morse = '... -.-- -. --.- / .. ... / - .... . / ..-. ..- - ..- .-. .'

  return (
    <footer className="border-t border-cyan-500/10 py-12">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <button
          onClick={() => setDecoded(!decoded)}
          className="mb-4 font-mono text-xs tracking-[0.3em] text-cyan-500/40 transition-colors hover:text-cyan-400"
        >
          {decoded ? 'SYNQ IS THE FUTURE' : morse}
        </button>
        <p className="text-xs text-gray-600">
          &copy; 2099 SYNQ Corp. All rights reserved across all known dimensions.
        </p>
        <p className="mt-1 text-[10px] text-gray-700">
          Built with mass-energy equivalence and questionable design choices.
        </p>
      </div>
    </footer>
  )
}

// ============================================================================
// MAIN LANDING COMPONENT
// ============================================================================

export function LandingPage() {
  const scrollY = useScrollY()

  return (
    <div className="relative min-h-screen bg-gray-950 text-white">
      <GridBackground />
      <FloatingParticles />

      {/* Sticky nav */}
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrollY > 50
            ? 'border-b border-cyan-500/10 bg-gray-950/90 backdrop-blur-md'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="font-bahnschrift text-xl font-bold tracking-[0.15em] text-cyan-400">
            SYNQ
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-gray-500 sm:block">v4.7.2-quantum</span>
            <Link
              href="/booking"
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              Enter the Grid
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <MatrixRain />
        <div className="relative z-10">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.5em] text-cyan-500/60">
            Temporal Booking Protocol v4.7
          </p>
          <h1 className="font-bahnschrift text-6xl font-bold tracking-tight sm:text-8xl">
            <GlitchText>SYNQ</GlitchText>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg text-gray-400">
            The scheduling system that exists in all timelines simultaneously.
            Book appointments across dimensions with quantum precision.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/booking"
              className="group relative overflow-hidden rounded-lg bg-cyan-500 px-8 py-3 text-sm font-bold text-gray-900 transition-all hover:bg-cyan-400 hover:shadow-xl hover:shadow-cyan-500/30"
            >
              <span className="relative z-10">Initialize Booking Sequence</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
            <button className="rounded-lg border border-gray-700 px-8 py-3 text-sm font-medium text-gray-400 transition-all hover:border-cyan-500/30 hover:text-cyan-400">
              View Documentation
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce text-cyan-500/40">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <StatsSection />

      {/* Orbital diagram + features */}
      <section className="py-20">
        <h2 className="mb-12 text-center font-bahnschrift text-2xl font-bold uppercase tracking-[0.2em] text-cyan-400">
          <GlitchText>System Architecture</GlitchText>
        </h2>
        <OrbitalDiagram />
      </section>

      {/* Features */}
      <FeaturesGrid />

      {/* Terminal */}
      <TerminalSection />

      {/* Power Slider */}
      <section className="py-20">
        <h2 className="mb-8 text-center font-bahnschrift text-sm uppercase tracking-widest text-gray-500">
          Adjust Temporal Flux
        </h2>
        <PowerSlider />
      </section>

      {/* Interactive Booking Visualizer */}
      <section className="py-20">
        <BookingVisualizer />
      </section>

      {/* Timeline */}
      <TimelineSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* CTA */}
      <section className="relative py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-bahnschrift text-3xl font-bold text-white">
            Ready to <GlitchText>transcend</GlitchText> scheduling?
          </h2>
          <p className="mt-4 text-gray-400">
            Join 847,293 practitioners who have already entered the grid.
          </p>
          <Link
            href="/booking"
            className="mt-8 inline-block rounded-lg bg-cyan-500 px-10 py-4 text-sm font-bold text-gray-900 transition-all hover:bg-cyan-400 hover:shadow-xl hover:shadow-cyan-500/30"
          >
            Enter the Grid
          </Link>
        </div>
      </section>

      {/* Footer */}
      <MorseFooter />

      {/* CSS for floating particles animation */}
      <style jsx global>{`
        @keyframes float-up {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
