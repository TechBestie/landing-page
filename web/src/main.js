import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import './style.css'
import { CATEGORIES, PROJECTS as DEFAULT_PROJECTS } from './data.js'
import { DEFAULT_PRICING, DEFAULT_SETTINGS } from './pricing-default.js'
import { initAdmin } from './admin.js'
import { initPricing } from './pricing.js'
import { loadRates } from './currency.js'
import { LANGS, t, tr, getLang, setLang, onLang, applyI18n } from './i18n.js'

const $ = (id) => document.getElementById(id)
const lite = matchMedia('(max-width: 760px), (pointer: coarse)').matches
const catColor = (id) => (CATEGORIES.find((c) => c.id === id) || CATEGORIES[0]).color
const catLabel = (id) => tr((CATEGORIES.find((c) => c.id === id) || CATEGORIES[0]).label)
const mod = (n, m) => ((n % m) + m) % m

/* ---------- Renderer, scene, camera ---------- */

const canvas = $('scene')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0x0a0603, 9, 22)
scene.background = makeBackdrop()

const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.55

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60)
const world = new THREE.Group()
scene.add(world)

const keyLight = new THREE.PointLight(0xfbbf24, 60, 30)
keyLight.position.set(5, 4, 6)
const rimLight = new THREE.PointLight(0xf97316, 50, 30)
rimLight.position.set(-6, -3, 4)
scene.add(keyLight, rimLight, new THREE.AmbientLight(0x3a2412, 0.6))

let composer = null
if (!lite) {
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.34, 0.6, 0.9))
  composer.addPass(new OutputPass())
}

function makeBackdrop() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')
  g.fillStyle = '#080402'
  g.fillRect(0, 0, 512, 512)
  const blob = (x, y, r, color) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, color)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 512, 512)
  }
  blob(470, 40, 330, 'rgba(245,158,11,0.34)')
  blob(40, 470, 340, 'rgba(154,52,18,0.42)')
  blob(60, 60, 260, 'rgba(120,72,30,0.30)')
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ---------- Tower: a stack of software "components" ---------- */

const SEG = 0.62
const VARIANTS = 8
const PERIOD = SEG * VARIANTS
const tower = new THREE.Group()
world.add(tower)
const segments = []

const chrome = new THREE.MeshPhysicalMaterial({
  color: 0xd6a35c, metalness: 1, roughness: 0.16, iridescence: 0.3, iridescenceIOR: 1.6,
  iridescenceThicknessRange: [120, 520], clearcoat: 1,
})
const glassAmber = new THREE.MeshPhysicalMaterial({
  color: 0xfbbf24, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.42,
  iridescence: 0.35, iridescenceIOR: 1.3, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false,
})
const glassOrange = glassAmber.clone()
glassOrange.color.set(0xf97316)
const dark = new THREE.MeshStandardMaterial({ color: 0x1a0f07, metalness: 0.9, roughness: 0.35 })
const glow = new THREE.MeshBasicMaterial({ color: 0xfbbf24, toneMapped: false })
const glowOrange = new THREE.MeshBasicMaterial({ color: 0xf97316, toneMapped: false })

function makeSegment(v) {
  const g = new THREE.Group()
  const add = (geo, mat, y = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.y = y
    g.add(m)
    return m
  }
  if (v === 0) {
    add(new RoundedBoxGeometry(1.7, 0.14, 1.7, 4, 0.06), glassAmber)
    add(new THREE.BoxGeometry(1.2, 0.02, 0.02), glow, 0.09)
  } else if (v === 1) {
    add(new RoundedBoxGeometry(1.1, 0.26, 1.1, 4, 0.05), dark)
    add(new RoundedBoxGeometry(1.14, 0.03, 1.14, 2, 0.01), glow)
  } else if (v === 2) {
    add(new THREE.TorusGeometry(0.95, 0.07, 20, 90), chrome).rotation.x = Math.PI / 2
  } else if (v === 3) {
    add(new THREE.CylinderGeometry(0.42, 0.42, 0.44, 48), chrome)
    add(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 48), glowOrange)
  } else if (v === 4) {
    add(new RoundedBoxGeometry(1.35, 0.14, 1.35, 4, 0.06), glassOrange)
  } else if (v === 5) {
    add(new RoundedBoxGeometry(1.4, 0.2, 1.4, 4, 0.05), chrome)
  } else if (v === 6) {
    const r = add(new THREE.TorusGeometry(0.72, 0.05, 16, 80), glow)
    r.rotation.x = Math.PI / 2
    add(new THREE.OctahedronGeometry(0.3), chrome)
  } else {
    for (let k = 0; k < 4; k++) {
      const c = add(new RoundedBoxGeometry(0.42, 0.3, 0.42, 3, 0.05), k % 2 ? dark : chrome)
      c.position.set(Math.cos((k * Math.PI) / 2) * 0.5, 0, Math.sin((k * Math.PI) / 2) * 0.5)
    }
  }
  return g
}

const SEG_COUNT = VARIANTS * 4
for (let i = 0; i < SEG_COUNT; i++) {
  const v = i % VARIANTS
  const seg = makeSegment(v)
  seg.position.y = (i - SEG_COUNT / 2) * SEG
  // Speed and phase depend on the variant only, so shifting by PERIOD is seamless.
  seg.userData = { speed: (v % 2 ? -1 : 1) * (0.12 + v * 0.035), phase: v * 0.7 }
  tower.add(seg)
  segments.push(seg)
}

const dust = (() => {
  const n = lite ? 260 : 700
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 3 + Math.random() * 9
    const a = Math.random() * Math.PI * 2
    pos[i * 3] = Math.cos(a) * r
    pos[i * 3 + 1] = (Math.random() - 0.5) * 16
    pos[i * 3 + 2] = Math.sin(a) * r - 2
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.035, transparent: true, opacity: 0.6, depthWrite: false })
  )
  scene.add(pts)
  return pts
})()

/* ---------- Project cards on a helix ---------- */

let projects = DEFAULT_PROJECTS
let M = projects.length
const STEP = (Math.PI * 2) / 5
const RISE = 1.55
const RADIUS = 3.3
const CARD_W = 3.1
const CARD_H = 1.94
const cards = []
const cardGroup = new THREE.Group()
world.add(cardGroup)

function seeded(seed) {
  let s = seed * 9301 + 49297
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function drawCard(p, i, img) {
  const W = 1024, H = 640
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const rnd = seeded(i + 3)
  const col = catColor(p.category)

  g.beginPath()
  g.roundRect(6, 6, W - 12, H - 12, 46)
  g.clip()

  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#1d1208')
  bg.addColorStop(1, '#0a0603')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  const wash = g.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, 700)
  wash.addColorStop(0, col + 'aa')
  wash.addColorStop(1, col + '00')
  g.fillStyle = wash
  g.fillRect(0, 0, W, H)

  if (img) {
    // Cover-fit the uploaded picture.
    const r = Math.max(W / img.width, H / img.height)
    g.drawImage(img, (W - img.width * r) / 2, (H - img.height * r) / 2, img.width * r, img.height * r)
  } else drawMock(g, i, col, rnd, W, H)

  const shade = g.createLinearGradient(0, 250, 0, H)
  shade.addColorStop(0, 'rgba(10,5,2,0)')
  shade.addColorStop(0.7, 'rgba(10,5,2,0.92)')
  g.fillStyle = shade
  g.fillRect(0, 250, W, H)

  g.fillStyle = col
  g.font = '500 24px "JetBrains Mono", monospace'
  g.fillText(`${p.client.toUpperCase()}  /  ${catLabel(p.category).toUpperCase()}`, 56, 470)
  g.fillStyle = '#ffffff'
  let size = 92
  do g.font = `600 ${size}px "Space Grotesk", sans-serif`
  while (g.measureText(p.title).width > W - 210 && (size -= 4) > 36)
  g.fillText(p.title, 52, 566)

  g.font = '500 22px "JetBrains Mono", monospace'
  g.fillStyle = 'rgba(255,255,255,0.6)'
  const idx = String(i + 1).padStart(2, '0')
  g.fillText(idx, W - 56 - g.measureText(idx).width, 566)
  if (p.sample) {
    g.strokeStyle = 'rgba(255,255,255,0.45)'
    g.lineWidth = 2
    g.beginPath()
    g.roundRect(W - 176, 88, 126, 40, 20)
    g.stroke()
    g.fillText('SAMPLE', W - 158, 116)
  }

  g.strokeStyle = 'rgba(255,255,255,0.3)'
  g.lineWidth = 4
  g.beginPath()
  g.roundRect(8, 8, W - 16, H - 16, 44)
  g.stroke()

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = renderer.capabilities.getMaxAnisotropy()
  return t
}

function drawMock(g, i, col, rnd, W, H) {
  g.fillStyle = 'rgba(255,255,255,0.07)'
  g.fillRect(0, 0, W, 64)
  for (let k = 0; k < 3; k++) {
    g.beginPath()
    g.arc(44 + k * 30, 32, 8, 0, Math.PI * 2)
    g.fillStyle = 'rgba(255,255,255,0.28)'
    g.fill()
  }
  g.fillStyle = 'rgba(255,255,255,0.05)'
  g.fillRect(0, 64, 190, H)
  for (let k = 0; k < 6; k++) {
    g.fillStyle = k === i % 6 ? col + 'cc' : 'rgba(255,255,255,0.12)'
    g.beginPath()
    g.roundRect(30, 104 + k * 44, 90 + rnd() * 50, 14, 7)
    g.fill()
  }
  for (let k = 0; k < 3; k++) {
    g.fillStyle = 'rgba(255,255,255,0.07)'
    g.beginPath()
    g.roundRect(226 + k * 258, 100, 236, 120, 18)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.6)'
    g.font = '600 44px "Space Grotesk", sans-serif'
    g.fillText(String(Math.floor(12 + rnd() * 86)), 250 + k * 258, 172)
    g.fillStyle = col
    g.fillRect(250 + k * 258, 190, 60 + rnd() * 110, 6)
  }
  g.strokeStyle = col
  g.lineWidth = 4
  g.beginPath()
  for (let k = 0; k <= 12; k++) {
    const x = 236 + k * 62
    const y = 330 - rnd() * 70 - k * 3
    k ? g.lineTo(x, y) : g.moveTo(x, y)
  }
  g.stroke()
}

const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H)
let buildToken = 0

async function setProjects(list) {
  const token = ++buildToken
  const images = await Promise.all(list.map((p) => loadImage(p.image)))
  if (token !== buildToken) return // a newer rebuild started meanwhile
  for (const c of cards) {
    c.material.map.dispose()
    c.material.dispose()
    cardGroup.remove(c)
  }
  cards.length = 0
  projects = list
  M = projects.length
  if (filter && !projects.some((p) => p.category === filter)) filter = null
  projects.forEach((p, i) => {
    const mat = new THREE.MeshBasicMaterial({
      map: drawCard(p, i, images[i]), transparent: true, side: THREE.DoubleSide, toneMapped: false, alphaTest: 0.02,
    })
    const mesh = new THREE.Mesh(cardGeo, mat)
    mesh.userData = { index: i, opacity: 0, scale: 1 }
    cardGroup.add(mesh)
    cards.push(mesh)
  })
}

/* ---------- Pricing build: selected components stack up ---------- */

const build = new THREE.Group()
const buildLabels = new THREE.Group()
world.add(build, buildLabels)
const blocks = new Map()

function makeLabel(text) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 80
  const g = c.getContext('2d')
  g.fillStyle = 'rgba(255,244,230,0.9)'
  g.textBaseline = 'middle'
  // Shrink long names to fit, then cut what still does not.
  let label = '-- ' + text.toUpperCase()
  let size = 30
  do g.font = `500 ${size}px "JetBrains Mono", monospace`
  while (g.measureText(label).width > 500 && (size -= 2) >= 22)
  while (g.measureText(label).width > 500) label = label.slice(0, -2).trimEnd() + '…'
  g.fillText(label, 0, 40)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }))
  s.scale.set(2.6, 0.406, 1)
  s.center.set(0, 0.5)
  return s
}

function getBlock(item) {
  const key = getLang() + ':' + item.key
  if (blocks.has(key)) return blocks.get(key)
  const color = new THREE.Color(item.color)
  const size = 1.5 + Math.min(item.price / 50000000, 1) * 0.7
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(size, 0.3, size, 4, 0.07),
    new THREE.MeshPhysicalMaterial({
      color, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.78,
      iridescence: 0.25, clearcoat: 1, emissive: color, emissiveIntensity: 0.22,
    })
  )
  const edge = new THREE.Mesh(
    new RoundedBoxGeometry(size + 0.03, 0.025, size + 0.03, 2, 0.01),
    new THREE.MeshBasicMaterial({ color, toneMapped: false })
  )
  const mesh = new THREE.Group()
  mesh.add(body, edge)
  mesh.scale.setScalar(0.001)
  const label = makeLabel(item.label)
  label.material.opacity = 0
  const b = { mesh, label, size, y: 0, on: false }
  build.add(mesh)
  buildLabels.add(label)
  blocks.set(key, b)
  return b
}

// One block per option picked in the price wizard.
function setStack(items) {
  blocks.forEach((b) => (b.on = false))
  const gap = items.length > 9 ? 0.34 : 0.4
  items.forEach((item, k) => {
    const b = getBlock(item)
    b.on = true
    b.y = (k - (items.length - 1) / 2) * gap
  })
}

/* ---------- State ---------- */

let mode = 'loading'
let scroll = 0
let target = 0
let lastInput = 0
let filter = null
let calcMix = 0
let shiftX = 0
let shiftY = 0
let shiftZ = 0
let portrait = false
let panelShift = -2
let panelWide = false
let browseShift = 0
const pointer = new THREE.Vector2()
const clock = new THREE.Clock()

const wrapDelta = (i, s) => mod(i - s + M / 2, M) - M / 2
const focused = () => mod(Math.round(scroll), M)

let admin = null
let pricing = null
let content = { projects: DEFAULT_PROJECTS, pricing: DEFAULT_PRICING, settings: DEFAULT_SETTINGS }
const atAdminUrl = () => ['/admin', '/admin/'].includes(location.pathname)

function setMode(next) {
  if (mode === next) return
  if (mode === 'admin' && admin && !admin.leave()) return
  // The editor lives at /admin; anywhere else is the public site.
  const inAdmin = next === 'admin' || next === 'login'
  if (inAdmin !== atAdminUrl()) history.replaceState(null, '', inAdmin ? '/admin' : '/')
  mode = next
  document.body.className = 'mode-' + next + (document.body.classList.contains('explored') ? ' explored' : '')
  $('detail').classList.toggle('hidden', next !== 'detail')
  $('calc').classList.toggle('hidden', next !== 'calc')
  $('contact').classList.toggle('hidden', next !== 'contact')
  $('login').classList.toggle('hidden', next !== 'login')
  $('admin').classList.toggle('hidden', next !== 'admin')
  measurePanel()
  document.querySelectorAll('.nav button').forEach((b) => {
    const go = b.dataset.go
    b.classList.toggle('active', go === next || (go === 'browse' && next === 'detail'))
  })
}

// World units the scene moves left so it is centred beside the open panel.
function measurePanel() {
  const panel = document.querySelector('.panel:not(.hidden)')
  if (!panel) return
  const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const unitsPerPx = (2 * camera.userData.z * half * camera.aspect) / innerWidth
  panelShift = -((panel.offsetWidth + 32) / 2) * unitsPerPx
  panelWide = panel.classList.contains('wide')
}

function openDetail(i) {
  const p = projects[i]
  $('detail-client').textContent = `${p.client} / ${catLabel(p.category)}`
  $('detail-title').textContent = p.title
  $('detail-summary').textContent = tr(p.summary)
  $('detail-tags').replaceChildren(
    ...p.tags.map((t) => Object.assign(document.createElement('li'), { textContent: t }))
  )
  setMode('detail')
}

function goTo(i) {
  target += wrapDelta(i, target)
  lastInput = performance.now()
}

function nudge(amount) {
  if (mode === 'detail') setMode('browse')
  if (mode !== 'browse') return
  target += amount
  lastInput = performance.now()
  document.body.classList.add('explored')
}

/* ---------- HUD wiring ---------- */

function buildFilters() {
  const ul = $('filters')
  ul.replaceChildren()
  CATEGORIES.forEach((c) => {
    const li = document.createElement('li')
    const b = document.createElement('button')
    b.textContent = tr(c.label)
    b.classList.toggle('active', filter === c.id)
    b.addEventListener('click', () => {
      filter = filter === c.id ? null : c.id
      ul.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b && filter))
      if (mode !== 'browse') setMode('browse')
      if (!filter) return
      let best = null
      projects.forEach((p, i) => {
        if (p.category !== filter) return
        const d = Math.abs(wrapDelta(i, target))
        if (best === null || d < best.d) best = { i, d }
      })
      if (best) goTo(best.i)
    })
    li.append(b)
    ul.append(li)
  })
}

function buildLangSwitch() {
  $('lang').replaceChildren(
    ...LANGS.map((code) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = code.toUpperCase()
      b.setAttribute('aria-pressed', String(code === getLang()))
      b.addEventListener('click', () => setLang(code))
      return b
    })
  )
}

function updateContactLink() {
  $('contact-wa').href = `https://wa.me/${content.settings.wa}?text=` + encodeURIComponent(t('contact.msg'))
}

// New content from the server or from the admin dashboard.
async function setContent(next) {
  content = {
    projects: next.projects?.length ? next.projects : DEFAULT_PROJECTS,
    pricing: next.pricing || DEFAULT_PRICING,
    settings: { ...DEFAULT_SETTINGS, ...next.settings },
  }
  pricing.setContent(content.pricing, content.settings)
  updateContactLink()
  loadRates()
  await setProjects(content.projects)
}

onLang(() => {
  buildLangSwitch()
  buildFilters()
  updateContactLink()
  setProjects(projects) // card labels are drawn into textures
  if (mode === 'detail') openDetail(focused())
})

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]')
  if (go) {
    setMode(go.dataset.go)
    return
  }
  if (e.target.closest('[data-close]')) setMode('browse')
})
$('brand').addEventListener('click', (e) => {
  e.preventDefault()
  setMode('browse')
})

/* ---------- Input ---------- */

addEventListener(
  'wheel',
  (e) => {
    if (e.target.closest('.panel')) return
    e.preventDefault()
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1
    nudge((e.deltaY * unit) / 340)
  },
  { passive: false }
)

let drag = null
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, moved: 0 }
  canvas.setPointerCapture(e.pointerId)
})
canvas.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  if (!drag) return
  const dx = e.clientX - drag.x
  const dy = e.clientY - drag.y
  drag.moved += Math.abs(dx) + Math.abs(dy)
  drag.x = e.clientX
  drag.y = e.clientY
  if (drag.moved > 6) nudge(-dy / 150 - dx / 220)
})
const raycaster = new THREE.Raycaster()
canvas.addEventListener('pointerup', (e) => {
  const wasClick = drag && drag.moved <= 6
  drag = null
  if (!wasClick || (mode !== 'browse' && mode !== 'detail')) return
  raycaster.setFromCamera(
    new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1),
    camera
  )
  const hit = raycaster.intersectObjects(cards.filter((c) => c.material.opacity > 0.3))[0]
  if (!hit) {
    if (mode === 'detail') setMode('browse')
    return
  }
  const i = hit.object.userData.index
  if (Math.abs(wrapDelta(i, scroll)) < 0.5) openDetail(i)
  else {
    setMode('browse')
    goTo(i)
  }
})
canvas.addEventListener('pointercancel', () => (drag = null))

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMode('browse')
  if (e.target.closest('.panel')) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nudge(1)
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nudge(-1)
  if (e.key === 'Enter' && mode === 'browse') openDetail(focused())
})

/* ---------- Layout ---------- */

function resize() {
  const w = innerWidth
  const h = innerHeight
  renderer.setSize(w, h, false)
  composer?.setSize(w, h)
  camera.aspect = w / h
  portrait = camera.aspect < 0.9
  // Keep a full card visible: pull the camera back on narrow screens.
  const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  camera.userData.z = Math.max(9.6, RADIUS + (CARD_W * 1.12) / (2 * half * camera.aspect))
  // On wide screens the scene sits right of centre, clear of the headline.
  browseShift = portrait ? 0 : 0.09 * 2 * camera.userData.z * half * camera.aspect
  camera.updateProjectionMatrix()
  measurePanel()
}
addEventListener('resize', resize)

/* ---------- Frame loop ---------- */

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.elapsedTime
  const k = 1 - Math.pow(0.001, dt) // frame-rate independent easing

  if (performance.now() - lastInput > 450 && !drag) target += (Math.round(target) - target) * k * 0.9
  scroll += (target - scroll) * k * 0.75

  const inCalc = mode === 'calc'
  const side = mode !== 'browse' && mode !== 'loading'
  calcMix += ((inCalc ? 1 : 0) - calcMix) * k * 0.8
  shiftX += ((side ? (portrait ? 0 : panelShift) : browseShift) - shiftX) * k * 0.7
  shiftY += ((side && portrait ? 1.7 : 0) - shiftY) * k * 0.7
  // A wide panel leaves little room, so the cards also step back to fit.
  shiftZ += ((side && !portrait && panelWide && !inCalc ? -5 : 0) - shiftZ) * k * 0.7
  // Further away, the same sideways move covers less of the screen.
  const depth = (camera.userData.z - shiftZ) / camera.userData.z
  world.position.set(shiftX * depth, shiftY, shiftZ)

  // Tower
  tower.position.y = mod(scroll * RISE * 0.5, PERIOD) - PERIOD / 2
  tower.rotation.y = scroll * 0.5 + t * 0.06
  const thin = 1 - calcMix
  tower.scale.set(thin, 1, thin)
  tower.visible = thin > 0.02
  for (const s of segments) s.rotation.y = s.userData.phase + t * s.userData.speed

  // Cards
  const f = focused()
  cards.forEach((card, i) => {
    const d = wrapDelta(i, scroll)
    const a = d * STEP
    card.position.set(Math.sin(a) * RADIUS, -d * RISE, Math.cos(a) * RADIUS)
    // Turn with the helix but never show the mirrored back face.
    card.rotation.y = Math.sin(a) * 0.95
    const isFocus = i === f
    // On phones the side cards sit behind the text, so they stay faint.
    let o = isFocus ? 1 : portrait ? 0.28 : 0.5
    if (filter && projects[i].category !== filter) o = 0.08
    if (mode === 'detail' && !isFocus) o *= 0.35
    if (mode === 'contact' || mode === 'login') o *= 0.3
    o *= 1 - calcMix
    const u = card.userData
    u.opacity += (o - u.opacity) * k
    u.scale += ((isFocus ? 1.12 : 0.92) - u.scale) * k
    card.material.opacity = u.opacity
    card.visible = u.opacity > 0.01
    card.scale.setScalar(u.scale)
  })

  // Pricing build
  build.rotation.y = t * 0.25
  const bs = portrait ? 0.72 : 1
  build.scale.setScalar(bs)
  buildLabels.scale.setScalar(bs)
  // Sit left of centre so the labels have room before the panel starts.
  build.position.x = buildLabels.position.x = portrait ? 0 : -1.25
  blocks.forEach((b) => {
    const show = b.on && inCalc ? 1 : 0.001
    const s = b.mesh.scale.x + (show - b.mesh.scale.x) * k
    b.mesh.scale.setScalar(s)
    b.mesh.position.y += (b.y - b.mesh.position.y) * k
    b.mesh.visible = s > 0.01
    b.label.position.set(b.size * 0.78, b.mesh.position.y, 0)
    b.label.material.opacity += ((b.on && inCalc && !portrait ? 1 : 0) - b.label.material.opacity) * k
  })

  dust.rotation.y = t * 0.015
  dust.position.y = mod(scroll * 0.4, 8) - 4

  camera.position.x += (pointer.x * 0.45 - camera.position.x) * k * 0.4
  camera.position.y += (pointer.y * 0.28 - camera.position.y) * k * 0.4
  camera.position.z = camera.userData.z
  camera.lookAt(0, 0, 0)

  $('counter').textContent = `${String(f + 1).padStart(2, '0')} / ${String(M).padStart(2, '0')}`

  if (composer) composer.render()
  else renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

/* ---------- Boot ---------- */

function runLoader(ready) {
  const grid = $('loader-grid')
  const num = $('loader-num')
  const start = performance.now()
  let done = false
  ready.then(() => (done = true))
  const tick = () => {
    const elapsed = performance.now() - start
    // Reach 90% on a timer, then wait for assets before finishing.
    let p = Math.min(elapsed / 1600, 1) * 90
    if (done && elapsed > 1600) p = Math.min(90 + (elapsed - 1600) / 40, 100)
    num.textContent = '/' + String(Math.floor(p)).padStart(3, '0')
    let out = ''
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 16; c++) out += Math.random() < 0.07 ? Math.floor(Math.random() * 10) : '/'
      out += '\n'
    }
    grid.textContent = out
    if (p < 100) return setTimeout(tick, 70)
    $('loader').classList.add('hidden')
    $('hud').classList.remove('hidden')
    if (atAdminUrl()) admin.open()
    else setMode('browse')
  }
  tick()
}

async function boot() {
  resize()
  buildFilters()
  const fonts = Promise.all([
    document.fonts.load('600 92px "Space Grotesk"'),
    document.fonts.load('500 24px "JetBrains Mono"'),
  ]).catch(() => {})
  applyI18n()
  buildLangSwitch()
  const loaded = fetch('/api/content')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
  pricing = initPricing({ onStack: setStack })
  admin = initAdmin({
    categories: CATEGORIES,
    getContent: () => content,
    preview: (list, focus) => setProjects(list).then(() => focus != null && goTo(Math.min(focus, M - 1))),
    apply: setContent,
    show: (panel) => setMode(panel),
  })
  const ready = Promise.race([fonts, new Promise((r) => setTimeout(r, 3000))]).then(async () => {
    await setContent(await loaded)
    renderer.compile(scene, camera)
  })
  runLoader(ready)
  requestAnimationFrame(frame)
}

boot()
