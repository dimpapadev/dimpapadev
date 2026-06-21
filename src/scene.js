import * as THREE from 'three'
import signImgLeftSrc from './assets/image.png'
import signImgRightSrc from './assets/images.jpg'

// Per-level color themes: [sky top, sky bottom, mountain, accent]
const THEMES = [
  { sky1: 0x1b1035, sky2: 0x3a1656, mountain: 0x241b4a, accent: 0xff3d7f }, // hero
  { sky1: 0x0d1b3a, sky2: 0x1c3a6b, mountain: 0x16264a, accent: 0x3fa9ff }, // about
  { sky1: 0x2a0d1b, sky2: 0x5a1530, mountain: 0x3a1224, accent: 0xff3d7f }, // career (dungeon)
  { sky1: 0x0d2a1f, sky2: 0x14543a, mountain: 0x123a28, accent: 0x39ff9d }, // stack (inventory)
  { sky1: 0x241a0d, sky2: 0x4a3315, mountain: 0x2e2210, accent: 0xffd23f }, // quality
  { sky1: 0x0a1a3a, sky2: 0x12356b, mountain: 0x0e2450, accent: 0x3fa9ff }, // cloud
  { sky1: 0x1a0a3a, sky2: 0x35126b, mountain: 0x230e50, accent: 0xb16cff }, // services (armory)
  { sky1: 0x0a2a2a, sky2: 0x125454, mountain: 0x0e3a3a, accent: 0x39ff9d }, // infra
  { sky1: 0x0b0e1a, sky2: 0x1a0e2a, mountain: 0x150f28, accent: 0xff3d7f }, // contact
]

// the floor/horizon line was raised from -0.84 to -0.5 to give the
// perspective grid enough room to read as an angled floor rather than a
// flat sliver — every world-space anchor below was shifted by the same
// +0.34 so relative spacing (e.g. the avatar's chair touching this line)
// stays exactly as already tuned.
const HORIZON_Y = -0.5

// the bear logo image is 3840x2160 (1.778 aspect) — keep that ratio so it
// doesn't get squashed into a square.
const BEAR_H = 0.15
const BEAR_W = BEAR_H * (3840 / 2160)

function lerpColor(a, b, t) {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  return ca.lerp(cb, t)
}

// shared dimensions + line layout for the converging perspective grid, so
// the fine grid and the brighter "beam" overlay line up exactly — lines fan
// out from a vanishing point at top-center (under the sun) to the bottom
// edge (closest to the viewer), like a road/runway receding into the horizon.
const GRID_W = 800
const GRID_H = 200

function buildGridLines() {
  const vanishX = GRID_W / 2
  const count = 14
  const lines = []
  for (let i = -count; i <= count; i++) {
    lines.push({
      topX: vanishX + i * 5,
      bottomX: vanishX + i * 34,
      accent: i % 3 === 0,
    })
  }
  return lines
}

function makeGridTexture(lines) {
  const c = document.createElement('canvas')
  c.width = GRID_W
  c.height = GRID_H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0a0a1c'
  ctx.fillRect(0, 0, GRID_W, GRID_H)

  ctx.strokeStyle = '#2f3df0'
  ctx.lineWidth = 2
  lines.forEach(({ topX, bottomX }) => {
    ctx.beginPath()
    ctx.moveTo(topX, 0)
    ctx.lineTo(bottomX, GRID_H)
    ctx.stroke()
  })

  // horizontal rows bunch up near the top (the far horizon) and spread out
  // near the bottom (closest to the viewer) for a forced-perspective feel
  const rows = 8
  for (let r = 1; r <= rows; r++) {
    const t = r / rows
    const y = GRID_H * (1 - Math.pow(1 - t, 2.4))
    ctx.globalAlpha = 0.4 + t * 0.55
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(GRID_W, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

// the brighter "spotlight" verticals layered on top of the grid — same line
// layout, just a subset drawn thicker on a transparent background, white so
// it can be tinted per theme.
function makeBeamsTexture(lines) {
  const c = document.createElement('canvas')
  c.width = GRID_W
  c.height = GRID_H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#ffffff'
  lines
    .filter((l) => l.accent)
    .forEach(({ topX, bottomX }) => {
      ctx.beginPath()
      ctx.moveTo(topX - 1.5, 0)
      ctx.lineTo(topX + 1.5, 0)
      ctx.lineTo(bottomX + 5, GRID_H)
      ctx.lineTo(bottomX - 5, GRID_H)
      ctx.closePath()
      ctx.fill()
    })
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

// the classic retrowave sun: a disc with horizontal "scanline" cuts through
// its lower half. Drawn white so it can be tinted with the level's accent
// color each frame instead of baking one fixed color in.
function makeSunTexture() {
  const size = 256
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  ctx.globalCompositeOperation = 'destination-out'
  let y = size * 0.52
  let band = 9
  let gap = 5
  while (y < size * 0.95) {
    ctx.fillRect(0, y, size, gap)
    y += gap + band
    band = Math.max(4, band - 0.4)
    gap = Math.min(11, gap + 0.5)
  }
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

// a soft radial glow sprite sitting behind the sun (and reused, scaled flat,
// as the glow along the horizon where the grid meets it).
function makeGlowTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.3)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

// a small retro pixel-art ship for the ambient "space invaders" scene —
// a simple triangular hull with a glowing cockpit.
// the classic arcade Space Invaders player cannon, drawn from a literal
// pixel bitmap (1 = filled) so it reads as the actual game sprite rather
// than a generic sci-fi ship.
const SHIP_BITMAP = [
  '0000001100000',
  '0000011110000',
  '0000011110000',
  '0111111111110',
  '1111111111111',
  '1111111111111',
  '1111111111111',
  '1101111111011',
]

function makeShipTexture() {
  const cell = 3
  const w = SHIP_BITMAP[0].length * cell
  const h = SHIP_BITMAP.length * cell
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#39ff9d'
  SHIP_BITMAP.forEach((row, y) => {
    row.split('').forEach((bit, x) => {
      if (bit === '1') ctx.fillRect(x * cell, y * cell, cell, cell)
    })
  })

  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

// a tiny bright laser bolt, shared by every projectile instance.
function makeBoltTexture() {
  const c = document.createElement('canvas')
  c.width = 6
  c.height = 16
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#9dfff0'
  ctx.fillRect(1, 0, 4, 16)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

const SKYLINE_W = 1400
const SKYLINE_H = 260

// generates the building rectangles once (facade shading + window cells) so
// the facade texture and the tintable window-glow overlay stay perfectly
// aligned — the sun's gap is carved out here too.
function buildSkylineLayout() {
  const w = SKYLINE_W
  const h = SKYLINE_H
  const baseShades = [
    ['#1c1530', '#0e0a18'],
    ['#221a38', '#120e1f'],
    ['#170f26', '#0a0712'],
  ]

  // the sun sits at world x=0, radius 0.5, on a plane the same width as this
  // canvas (14 world units across 1400px = 100px/unit) — keep a clear gap
  // around its center so buildings frame it instead of overlapping it.
  const gapStart = w / 2 - 95
  const gapEnd = w / 2 + 95

  const buildings = []
  let x = 0
  while (x < w) {
    const bw = 55 + Math.random() * 65
    if (x < gapEnd && x + bw > gapStart) {
      x = gapEnd
      continue
    }

    const bh = 90 + Math.random() * 150
    const top = h - bh
    const [lightShade, darkShade] = baseShades[Math.floor(Math.random() * baseShades.length)]
    const roofDetail = Math.random() < 0.25 ? 'antenna' : Math.random() < 0.4 ? 'ac' : null

    const windowCells = []
    const cell = 10
    for (let wx = x + 5; wx < x + bw - 8; wx += cell) {
      const columnLit = Math.random() < 0.55
      for (let wy = top + 8; wy < h - 8; wy += cell) {
        windowCells.push({ wx, wy, lit: columnLit ? Math.random() < 0.75 : Math.random() < 0.12 })
      }
    }

    buildings.push({ x, bw, bh, top, lightShade, darkShade, roofDetail, windowCells })
    x += bw
  }

  return buildings
}

// the building facades (gradient shading, parapet caps, panel seams, roof
// details) — opaque and never tinted, so they stay a constant dark
// silhouette regardless of the current level theme.
function makeSkylineTexture(buildings) {
  const w = SKYLINE_W
  const h = SKYLINE_H
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')

  buildings.forEach(({ x, bw, bh, top, lightShade, darkShade, roofDetail }) => {
    const grad = ctx.createLinearGradient(x, top, x, h)
    grad.addColorStop(0, lightShade)
    grad.addColorStop(1, darkShade)
    ctx.fillStyle = grad
    ctx.fillRect(x, top, bw - 3, bh)

    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(x, top, bw - 3, 2)

    if (bw > 85) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 1
      const seams = Math.floor(bw / 45)
      for (let s = 1; s <= seams; s++) {
        const sx = x + (bw / (seams + 1)) * s
        ctx.beginPath()
        ctx.moveTo(sx, top)
        ctx.lineTo(sx, h)
        ctx.stroke()
      }
    }

    ctx.fillStyle = darkShade
    if (roofDetail === 'antenna') {
      ctx.fillRect(x + bw * 0.3, top - 18 - Math.random() * 20, 3, 18 + Math.random() * 20)
    } else if (roofDetail === 'ac') {
      ctx.fillRect(x + bw * 0.55, top - 8, bw * 0.2, 8)
    }
  })

  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

// the windows only, drawn white on a transparent background so this layer
// can be tinted to match the sun's color each frame (lit windows brighter,
// dim ones lower-opacity, same hue either way).
function makeWindowsTexture(buildings) {
  const w = SKYLINE_W
  const h = SKYLINE_H
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#ffffff'

  buildings.forEach(({ windowCells }) => {
    windowCells.forEach(({ wx, wy, lit }) => {
      ctx.globalAlpha = lit ? 0.95 : 0.25
      ctx.fillRect(wx, wy, 4, 5)
    })
  })
  ctx.globalAlpha = 1

  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

export class PixelWorld {
  constructor(canvas) {
    this.canvas = canvas
    this.clock = new THREE.Clock()
    this.progress = 0
    this.themeIndex = 0
    this.targetTheme = THEMES[0]

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x0b0e1a)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
    this.camera.position.z = 10

    this.pixelRatioScale = 0.35 // chunky pixel look

    this._buildSky()
    this._buildStars()
    this._buildSun()
    this._buildSkyline()
    this._buildSigns()
    this._buildGround()
    this._buildCharacter()
    this._buildCat()
    this._buildDeskProp()
    this._buildSpaceInvaders()
    this._buildDog()

    this._resize()
    window.addEventListener('resize', () => this._resize())
  }

  _resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    const pw = Math.max(160, Math.floor(w * this.pixelRatioScale))
    const ph = Math.max(100, Math.floor(h * this.pixelRatioScale))
    this.renderer.setSize(pw, ph, false)
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.imageRendering = 'pixelated'

    const aspect = w / h
    this.camera.left = -aspect
    this.camera.right = aspect
    this.camera.top = 1
    this.camera.bottom = -1
    this.camera.updateProjectionMatrix()
    this.aspect = aspect

    if (this.signs) {
      this.signs.forEach((group) => {
        group.position.x = group.userData.side === 'left' ? -aspect + 0.5 : aspect - 0.5
      })
    }
    this._layoutSignArms()
  }

  // recomputes every mounting arm's span (screen edge -> box edge) and the
  // bracket plate's position. Called on resize, and again after each sign's
  // image finishes loading — the box size is only known once that happens,
  // and the arms need to follow it instead of staying at a placeholder size.
  _layoutSignArms() {
    if (!this.signArms || this.aspect == null) return
    const aspect = this.aspect
    this.signArms.forEach(({ arm, bracket, group, side, edge }) => {
      const boxW = group.userData.boxW
      const boxH = group.userData.boxH
      const boxEdgeX = group.position.x + (side === 'left' ? -boxW / 2 : boxW / 2)
      const screenEdgeX = side === 'left' ? -aspect : aspect
      const armY = group.position.y + (edge === 'top' ? boxH / 2 : -boxH / 2)
      arm.position.set((boxEdgeX + screenEdgeX) / 2, armY, arm.position.z)
      arm.scale.x = Math.max(0.001, Math.abs(screenEdgeX - boxEdgeX))
      bracket.position.set(screenEdgeX + (side === 'left' ? 0.03 : -0.03), armY, bracket.position.z)
    })
  }

  _buildSky() {
    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color(0x1b1035) },
        colorBottom: { value: new THREE.Color(0x3a1656) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        void main() {
          gl_FragColor = vec4(mix(colorBottom, colorTop, vUv.y), 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    })
    this.skyMat = mat
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = -10
    mesh.frustumCulled = false
    this.scene.add(mesh)
  }

  _buildStars() {
    const count = 140
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8
      positions[i * 3 + 1] = Math.random() * 0.9 + 0.05
      positions[i * 3 + 2] = -5 - Math.random() * 3
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, sizeAttenuation: false })
    this.stars = new THREE.Points(geo, mat)
    this.scene.add(this.stars)
  }

  // the retrowave sun: a tintable disc + a softer glow behind it, sitting
  // sits closer to vertical center (rather than tucked at the horizon) so
  // its upper dome reads clearly above the skyline, like the reference.
  _buildSun() {
    const sunTex = makeSunTexture()
    const glowTex = makeGlowTexture()
    const sunRadius = 0.5
    const sunY = 0.05

    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false })
    const glow = new THREE.Sprite(glowMat)
    glow.scale.set(sunRadius * 3.6, sunRadius * 3.6, 1)
    glow.position.set(0, sunY, -4.6)
    this.scene.add(glow)

    const sunMat = new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false })
    const sun = new THREE.Sprite(sunMat)
    sun.scale.set(sunRadius * 2, sunRadius * 2, 1)
    sun.position.set(0, sunY, -4.5)
    this.scene.add(sun)

    this.sun = sun
    this.sunGlow = glow
  }

  // a single skyline layer of flat-roofed buildings sitting in front of the
  // sun but behind the grid floor, plus a tintable window-glow layer right
  // on top of it (same building layout, so windows line up with facades).
  // Static — no scroll — so the gap left around the sun stays put.
  _buildSkyline() {
    const layout = buildSkylineLayout()
    const planeH = 0.95
    const planeW = 14

    const facadeGeo = new THREE.PlaneGeometry(planeW, planeH)
    facadeGeo.translate(0, planeH / 2, 0)
    const facadeMat = new THREE.MeshBasicMaterial({ map: makeSkylineTexture(layout), transparent: true })
    const facade = new THREE.Mesh(facadeGeo, facadeMat)
    facade.position.set(0, HORIZON_Y, -2)
    this.scene.add(facade)
    this.skyline = facade

    const winGeo = new THREE.PlaneGeometry(planeW, planeH)
    winGeo.translate(0, planeH / 2, 0)
    const winMat = new THREE.MeshBasicMaterial({ map: makeWindowsTexture(layout), transparent: true })
    const windows = new THREE.Mesh(winGeo, winMat)
    windows.position.set(0, HORIZON_Y, -1.99)
    this.scene.add(windows)
    this.skylineWindows = windows
  }

  // two cyberpunk signs hanging just under the HUD header near the left and
  // right edges — each is a neon border sized to exactly match its image's
  // own aspect ratio (no stretching, no empty letterbox gaps), bolted to the
  // screen edge by two horizontal mounting arms (top + bottom) with bracket
  // plates, rather than hanging from a cable above. Border/arms are repositioned
  // in _resize() since the screen edges move with the camera's aspect.
  _buildSigns() {
    this.signs = []
    this.signArms = []
    const loader = new THREE.TextureLoader()
    const configs = [
      { side: 'left', color: 0xff2db3, imgSrc: signImgLeftSrc },
      { side: 'right', color: 0x39ffe0, imgSrc: signImgRightSrc },
    ]
    const signCenterY = 0.58 // sits well clear of the fixed HUD header
    const refArea = 0.16 // keeps both signs a comparable visual size regardless of aspect
    const margin = 0.018
    const borderThick = 0.014

    configs.forEach(({ side, color, imgSrc }) => {
      const group = new THREE.Group()
      group.position.set(0, signCenterY, -1.9)
      group.userData = { side, boxW: 0.32, boxH: 0.32 }
      this.scene.add(group)
      this.signs.push(group)

      const imgMat = new THREE.MeshBasicMaterial({ transparent: true })
      const imgPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), imgMat)
      group.add(imgPlane)

      const borderTop = new THREE.Mesh(new THREE.PlaneGeometry(0.1, borderThick), new THREE.MeshBasicMaterial({ color }))
      const borderBottom = new THREE.Mesh(new THREE.PlaneGeometry(0.1, borderThick), new THREE.MeshBasicMaterial({ color }))
      const borderLeft = new THREE.Mesh(new THREE.PlaneGeometry(borderThick, 0.1), new THREE.MeshBasicMaterial({ color }))
      const borderRight = new THREE.Mesh(new THREE.PlaneGeometry(borderThick, 0.1), new THREE.MeshBasicMaterial({ color }))
      ;[borderTop, borderBottom, borderLeft, borderRight].forEach((b) => {
        b.position.z = 0.001
        group.add(b)
      })

      const layout = (boxW, boxH) => {
        group.userData.boxW = boxW
        group.userData.boxH = boxH
        imgPlane.geometry.dispose()
        imgPlane.geometry = new THREE.PlaneGeometry(boxW, boxH)
        const outerW = boxW + margin * 2
        const outerH = boxH + margin * 2
        borderTop.geometry.dispose()
        borderTop.geometry = new THREE.PlaneGeometry(outerW, borderThick)
        borderTop.position.set(0, boxH / 2 + margin / 2, 0)
        borderBottom.geometry.dispose()
        borderBottom.geometry = new THREE.PlaneGeometry(outerW, borderThick)
        borderBottom.position.set(0, -boxH / 2 - margin / 2, 0)
        borderLeft.geometry.dispose()
        borderLeft.geometry = new THREE.PlaneGeometry(borderThick, outerH)
        borderLeft.position.set(-boxW / 2 - margin / 2, 0, 0)
        borderRight.geometry.dispose()
        borderRight.geometry = new THREE.PlaneGeometry(borderThick, outerH)
        borderRight.position.set(boxW / 2 + margin / 2, 0, 0)
      }
      layout(0.32, 0.32)

      loader.load(imgSrc, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        imgMat.map = tex
        imgMat.needsUpdate = true
        const aspect = tex.image.width / tex.image.height
        layout(Math.sqrt(refArea * aspect), Math.sqrt(refArea / aspect))
        this._layoutSignArms()
      })

      // two horizontal mounting arms, attached exactly at the box's top and
      // bottom edges (not a guessed offset) — each running from there to the
      // screen edge with a bracket plate at the wall end. Exact span/edge
      // position is computed in _layoutSignArms() once box size is known.
      ;['top', 'bottom'].forEach((edge) => {
        const arm = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.02), new THREE.MeshBasicMaterial({ color: 0x2a2a36 }))
        arm.position.set(0, signCenterY, -1.85)
        this.scene.add(arm)

        const bracket = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.14), new THREE.MeshBasicMaterial({ color: 0x14141c }))
        bracket.position.set(0, signCenterY, -1.84)
        this.scene.add(bracket)

        this.signArms.push({ arm, bracket, group, side, edge })
      })
    })
  }

  // a synthwave neon grid floor: converging lines fanning out from a
  // vanishing point under the sun, plus a sparser layer of brighter "beam"
  // lines on top (tinted per level theme). Static, like a single photo of
  // the floor, with the horizon raised well above the bottom of the screen
  // so the perspective actually has room to read.
  _buildGround() {
    const lines = buildGridLines()
    const groundH = HORIZON_Y + 1 // fills from the horizon down to the bottom of the viewport

    const gridTex = makeGridTexture(lines)
    const gridGeo = new THREE.PlaneGeometry(14, groundH)
    gridGeo.translate(0, -groundH / 2, 0)
    const gridMat = new THREE.MeshBasicMaterial({ map: gridTex })
    const grid = new THREE.Mesh(gridGeo, gridMat)
    grid.position.set(0, HORIZON_Y, -1)
    this.scene.add(grid)

    const beamTex = makeBeamsTexture(lines)
    const beamGeo = new THREE.PlaneGeometry(14, groundH)
    beamGeo.translate(0, -groundH / 2, 0)
    const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true })
    const beams = new THREE.Mesh(beamGeo, beamMat)
    beams.position.set(0, HORIZON_Y, -0.99)
    this.scene.add(beams)
    this.beams = beams

    // soft glow behind the horizon line, then the bright line itself —
    // both tinted to match the sun/beams each frame
    const glowGeo = new THREE.PlaneGeometry(14, 0.14)
    const glowMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3 })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.set(0, HORIZON_Y, -0.96)
    this.scene.add(glow)
    this.horizonGlow = glow

    const stripGeo = new THREE.PlaneGeometry(14, 0.025)
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xfdf6ff })
    const strip = new THREE.Mesh(stripGeo, stripMat)
    strip.position.set(0, HORIZON_Y, -0.95)
    this.scene.add(strip)

    this.ground = grid
  }

  // Like the dog and cat, the avatar is a smooth SVG DOM overlay (see
  // #avatar-illustration in index.html / main.js) rather than a pixel-art
  // sprite. This keeps a plain position object the bob/gesture logic below
  // drives; getCharacterAnchor()/getCharacterHeadAnchor() project it to
  // screen space for the DOM overlay and its speech bubble to follow.
  _buildCharacter() {
    this.character = { position: { x: -0.55, y: -0.38 } }
    this.characterGesture = false
  }

  setGesture(active) {
    this.characterGesture = !!active
  }

  getCharacterAnchor() {
    return this._projectToScreen(this.character.position.x, this.character.position.y)
  }

  setDogPaused(paused) {
    this.dogPaused = !!paused
  }

  // shared world-space -> screen-pixel projection used by every DOM overlay
  // (speech bubbles, the dog/cat illustrations) so they all track the same
  // camera math the pixel-art world itself is rendered with.
  _projectToScreen(x, y) {
    const w = window.innerWidth
    const h = window.innerHeight
    const fracX = (x - this.camera.left) / (this.camera.right - this.camera.left)
    const fracY = 1 - (y - this.camera.bottom) / (this.camera.top - this.camera.bottom)
    return { x: fracX * w, y: fracY * h }
  }

  // projects the dog's current world position to screen pixel coordinates,
  // so DOM overlays (like its speech bubble) can track it while it roams.
  getDogAnchor() {
    return this._projectToScreen(this.dog.position.x, this.dog.position.y)
  }

  // same, but offset up to roughly head height — for things that should
  // float above the dog (e.g. its speech bubble) rather than at its feet.
  getDogHeadAnchor() {
    return this._projectToScreen(this.dog.position.x, this.dog.position.y + 0.16)
  }

  // Like the cat, the dog is rendered as a smooth SVG DOM overlay (see
  // #dog-illustration in index.html / main.js) rather than a pixel-art sprite.
  // This keeps a plain position object that the state machine below drives;
  // getDogAnchor() projects it to screen space for the DOM overlay to follow.
  _buildDog() {
    this.dog = { position: { x: -1.4, y: -0.44 } }

    this.dogState = 'walk'
    this.dogStateTimer = 0
    this.dogSpeed = 0.18 + Math.random() * 0.08
    this.dogWalkDistance = 0
    this.dogNextStop = 1.4 + Math.random() * 1.6
    this.dogBaseY = this.dog.position.y
    this.dogJumpedThisLap = false
    this.dogJumpTimer = 0
    this.dogJumpDuration = 0.55
    this.dogPaused = false
  }

  // The cat herself is rendered as a smooth (non-pixelated) SVG DOM overlay —
  // see #cat-illustration in index.html / main.js — so she doesn't get chunked
  // by the low-res pixel-art render target. This anchor is the invisible
  // world-space point the DOM overlay tracks, and what the dog's jump logic
  // measures against to know when to hop over her.
  _buildCat() {
    this.catAnchor = { x: 0.5, y: -0.45 }
  }

  // projects the (invisible) cat anchor to screen pixel coordinates for the DOM overlay.
  getCatAnchor() {
    return this._projectToScreen(this.catAnchor.x, this.catAnchor.y)
  }

  // offset up to roughly head height, for the cat's speech bubble.
  getCatHeadAnchor() {
    return this._projectToScreen(this.catAnchor.x, this.catAnchor.y + 0.18)
  }

  // a small side table (with a vinyl player gif on top) sitting just to the
  // right of the avatar's desk — like the cat, it's a static DOM overlay
  // anchored to a fixed world point rather than a pixel-art sprite.
  _buildDeskProp() {
    this.deskPropAnchor = { x: -0.15, y: -0.38 }
  }

  getDeskPropAnchor() {
    return this._projectToScreen(this.deskPropAnchor.x, this.deskPropAnchor.y)
  }

  // offset above the table, for the "NOW PLAYING" label.
  getDeskPropLabelAnchor() {
    return this._projectToScreen(this.deskPropAnchor.x, this.deskPropAnchor.y + 0.34)
  }

  // an ambient (non-interactive) "space invaders" scene: a ship drifts back
  // and forth across the sky, periodically firing at one of several bear
  // targets scattered above the skyline. A hit bear flashes, fades out, and
  // respawns elsewhere a couple seconds later.
  //
  // The bears themselves are NOT rendered in the WebGL scene — this canvas
  // is intentionally rendered at a fraction of screen resolution and then
  // scaled up with `image-rendering: pixelated` for the chunky retro look,
  // which would make the bear logo's fine linework look broken/blocky no
  // matter how its texture is filtered. So the bears are tracked here as
  // plain data (like the dog/cat) and rendered as smooth DOM <img> overlays
  // (see #bear-swarm in index.html/main.js) that read getBearAnchors() each
  // frame, the same pattern already used for the dog/cat/avatar.
  _buildSpaceInvaders() {
    const shipMat = new THREE.SpriteMaterial({ map: makeShipTexture(), transparent: true, depthWrite: false })
    this.ship = new THREE.Sprite(shipMat)
    this.ship.scale.set(0.09 * (13 / 8), 0.09, 1)
    this.ship.position.set(-1, 0.02, -1.7) // flies below the bears' spawn baseline (y: 0.12), shooting up at them
    this.scene.add(this.ship)
    this.shipDir = 1
    this.shipFireTimer = 1.5

    this.boltMat = new THREE.SpriteMaterial({ map: makeBoltTexture(), transparent: true, depthWrite: false })
    this.projectiles = []

    this.bears = []
    for (let i = 0; i < 4; i++) {
      const bear = { x: 0, y: 0, alive: true, opacity: 1, scale: 1, hitFlash: 0, respawnTimer: 0 }
      this._respawnBear(bear, true)
      this.bears.push(bear)
    }
  }

  // screen-space position + opacity/scale for every bear, for the DOM
  // overlay to render (mirrors getDogAnchor()'s world->screen projection).
  getBearAnchors() {
    return this.bears.map((bear) => ({
      ...this._projectToScreen(bear.x, bear.y),
      opacity: bear.opacity,
      scale: bear.scale,
    }))
  }

  // the play area for the ship/bears is the gap between the two hanging
  // neon signs (their inner edges), not the full screen width.
  _getPlayAreaX() {
    const breathingRoom = 0.18
    if (this.signs && this.signs.length === 2) {
      const left = this.signs.find((s) => s.userData.side === 'left')
      const right = this.signs.find((s) => s.userData.side === 'right')
      const leftInner = left.position.x + (left.userData.boxW || 0.3) / 2 + breathingRoom
      const rightInner = right.position.x - (right.userData.boxW || 0.3) / 2 - breathingRoom
      if (rightInner > leftInner) return { min: leftInner, max: rightInner }
    }
    const edge = (this.aspect || 1.6) - 0.5 - breathingRoom
    return { min: -edge, max: edge }
  }

  _respawnBear(bear, immediate) {
    const { min, max } = this._getPlayAreaX()
    // mostly hug the top of the sky, just under the HUD header, and keep
    // some spacing from other live bears so they read as sparse, not clumped
    let x
    for (let attempt = 0; attempt < 6; attempt++) {
      x = min + Math.random() * (max - min)
      const tooClose = this.bears.some(
        (other) => other !== bear && other.alive && Math.abs(other.x - x) < (max - min) / (this.bears.length + 1)
      )
      if (!tooClose) break
    }
    bear.x = x
    bear.y = 0.58 + Math.random() * 0.24
    bear.opacity = 1
    bear.scale = 1
    bear.alive = true
    bear.hitFlash = 0
    if (!immediate) bear.respawnTimer = 0
  }

  // fires straight up from the ship's current position — classic Space
  // Invaders aiming, not an angled shot toward a target.
  _spawnProjectile() {
    const bolt = new THREE.Sprite(this.boltMat)
    bolt.scale.set(0.025, 0.09, 1)
    bolt.position.set(this.ship.position.x, this.ship.position.y + 0.08, -1.69)
    this.scene.add(bolt)
    this.projectiles.push({ sprite: bolt, speed: 1.3 })
  }

  _hitBear(bear) {
    bear.alive = false
    bear.hitFlash = 0.25
    bear.respawnTimer = 1.8 + Math.random() * 1.6
  }

  _updateSpaceInvaders(dt) {
    const { min, max } = this._getPlayAreaX()
    const margin = 0.04
    this.ship.position.x += this.shipDir * dt * 0.35
    if (this.ship.position.x > max - margin || this.ship.position.x < min + margin) {
      this.shipDir *= -1
      this.ship.position.x = Math.max(min + margin, Math.min(max - margin, this.ship.position.x))
    }

    this.shipFireTimer -= dt
    if (this.shipFireTimer <= 0) {
      if (this.bears.some((b) => b.alive)) this._spawnProjectile()
      this.shipFireTimer = 1.0 + Math.random() * 1.4
    }

    this.projectiles = this.projectiles.filter((p) => {
      p.sprite.position.y += p.speed * dt
      if (p.sprite.position.y > 0.85) {
        this.scene.remove(p.sprite)
        return false
      }
      const hit = this.bears.find(
        (b) =>
          b.alive &&
          Math.abs(b.x - p.sprite.position.x) < BEAR_W * 0.45 &&
          Math.abs(b.y - p.sprite.position.y) < BEAR_H * 0.5
      )
      if (hit) {
        this._hitBear(hit)
        this.scene.remove(p.sprite)
        return false
      }
      return true
    })

    this.bears.forEach((bear) => {
      if (bear.alive) return
      if (bear.hitFlash > 0) {
        bear.hitFlash -= dt
        const t = Math.max(0, bear.hitFlash / 0.25)
        bear.scale = 1 + (1 - t) * 0.6
        bear.opacity = t
      } else {
        bear.opacity = 0
      }
      bear.respawnTimer -= dt
      if (bear.respawnTimer <= 0) this._respawnBear(bear)
    })
  }

  // the character sprite is centered on its own position (THREE.Sprite default
  // anchor), so for a speech bubble we want a point above its head, not its waist.
  getCharacterHeadAnchor() {
    return this._projectToScreen(this.character.position.x, this.character.position.y + 0.34)
  }

  _updateDog(dt) {
    const dog = this.dog
    const edge = this.aspect + 0.4
    const jumpTriggerDist = 0.22

    if (this.dogState === 'walk') {
      dog.position.x += this.dogSpeed * dt
      this.dogWalkDistance += this.dogSpeed * dt

      // hop over the cat when approaching her from the left
      if (
        !this.dogJumpedThisLap &&
        dog.position.x < this.catAnchor.x &&
        this.catAnchor.x - dog.position.x <= jumpTriggerDist
      ) {
        this.dogState = 'jump'
        this.dogJumpedThisLap = true
        this.dogJumpTimer = 0
        this.dogJumpStartX = dog.position.x
        this.dogJumpEndX = this.catAnchor.x + jumpTriggerDist + 0.18
      }

      if (dog.position.x > edge) {
        dog.position.x = -edge
        this.dogJumpedThisLap = false
      }

      if (this.dogState === 'walk' && this.dogWalkDistance >= this.dogNextStop) {
        this.dogState = 'stop'
        this.dogStateTimer = 0
      }
    } else if (this.dogState === 'jump') {
      this.dogJumpTimer += dt
      const jt = Math.min(1, this.dogJumpTimer / this.dogJumpDuration)
      dog.position.x = this.dogJumpStartX + (this.dogJumpEndX - this.dogJumpStartX) * jt
      dog.position.y = this.dogBaseY + Math.sin(jt * Math.PI) * 0.22
      if (jt >= 1) {
        dog.position.y = this.dogBaseY
        this.dogState = 'walk'
      }
    } else if (this.dogState === 'stop') {
      this.dogStateTimer += dt
      if (this.dogStateTimer > 1.0) {
        this.dogState = 'lick'
        this.dogStateTimer = 0
      }
    } else if (this.dogState === 'lick') {
      this.dogStateTimer += dt
      if (this.dogStateTimer > 1.8) {
        this.dogState = 'walk'
        this.dogWalkDistance = 0
        this.dogNextStop = 1.4 + Math.random() * 1.8
        this.dogSpeed = 0.18 + Math.random() * 0.08
      }
    }
  }

  // maps the internal state machine to the pose name the DOM overlay draws.
  getDogPose() {
    if (this.dogState === 'stop') return 'sit'
    return this.dogState
  }

  setProgress(progress, themeIndex) {
    this.progress = progress
    const idx = Math.min(THEMES.length - 1, Math.max(0, themeIndex))
    this.targetTheme = THEMES[idx]
  }

  update() {
    const dt = this.clock.getDelta()
    const t = this.clock.elapsedTime

    // theme color easing: sky gradient, plus the sun/beams/horizon accent
    if (!this._curSky1) {
      this._curSky1 = new THREE.Color(this.targetTheme.sky1)
      this._curSky2 = new THREE.Color(this.targetTheme.sky2)
      this._curAccent = new THREE.Color(this.targetTheme.accent)
    }
    this._curSky1.lerp(new THREE.Color(this.targetTheme.sky1), Math.min(1, dt * 1.5))
    this._curSky2.lerp(new THREE.Color(this.targetTheme.sky2), Math.min(1, dt * 1.5))
    this._curAccent.lerp(new THREE.Color(this.targetTheme.accent), Math.min(1, dt * 1.5))

    this.skyMat.uniforms.colorTop.value.copy(this._curSky1)
    this.skyMat.uniforms.colorBottom.value.copy(this._curSky2)

    this.sun.material.color.copy(this._curAccent)
    this.sunGlow.material.color.copy(this._curAccent)
    this.beams.material.color.copy(this._curAccent)
    this.horizonGlow.material.color.copy(this._curAccent)
    this.skylineWindows.material.color.copy(this._curAccent)

    // stars twinkle + slow drift
    this.stars.material.opacity = 0.6 + Math.sin(t * 2) * 0.2
    this.stars.rotation.z = t * 0.002

    // character position: holds still to gesture at a hovered skill, otherwise
    // bobs gently and sways with scroll progress (the DOM overlay's own CSS
    // animation handles the idle bob/point-wave visuals).
    if (this.characterGesture) {
      this.character.position.y = -0.38
      this.character.position.x = -0.55
    } else {
      this.character.position.y = -0.38
      this.character.position.x = -0.55 + Math.sin(this.progress * Math.PI * 2) * 0.08
    }

    if (!this.dogPaused) this._updateDog(dt)
    this._updateSpaceInvaders(dt)

    this.renderer.render(this.scene, this.camera)
  }
}
