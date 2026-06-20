import * as THREE from 'three'

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

function lerpColor(a, b, t) {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  return ca.lerp(cb, t)
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

// 32x32 hero sprite sheet. pose: 'idle0' | 'idle1' (walk bob) | 'point0' | 'point1' (gesturing at a skill)
function makeCharacterTexture(pose) {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, 32, 32)

  const skin = '#f3c89a'
  const skinShade = '#d9a877'
  const hair = '#2a1f3d'
  const hairHi = '#40325c'
  const shirt = '#2f8fe0'
  const shirtShade = '#1f699c'
  const shirtHi = '#6fc1ff'
  const pants = '#181028'
  const pantsShade = '#0d0818'
  const shoe = '#100a18'
  const eye = '#181018'

  const bob = pose === 'idle1' ? 1 : 0
  const pointing = pose === 'point0' || pose === 'point1'

  // hair back
  px(ctx, 11, 3 + bob, 10, 3, hair)
  // head
  px(ctx, 12, 5 + bob, 8, 7, skin)
  px(ctx, 12, 10 + bob, 8, 2, skinShade)
  // hair top + fringe
  px(ctx, 11, 4 + bob, 10, 2, hair)
  px(ctx, 11, 6 + bob, 2, 2, hairHi)
  // eyes
  px(ctx, 14, 8 + bob, 1, 2, eye)
  px(ctx, 18, 8 + bob, 1, 2, eye)

  // torso / shirt
  px(ctx, 10, 13 + bob, 12, 9, shirt)
  px(ctx, 10, 13 + bob, 3, 9, shirtShade)
  px(ctx, 19, 13 + bob, 3, 9, shirtShade)
  px(ctx, 14, 13 + bob, 4, 2, shirtHi)

  if (pointing) {
    // left arm resting on hip
    px(ctx, 8, 15, 3, 5, skin)
    px(ctx, 8, 19, 3, 2, shirtShade)
    // right arm raised diagonally, hand near head height — gesture frame alternates slightly
    const handY = pose === 'point0' ? 6 : 5
    px(ctx, 22, 14, 3, 5, shirt)
    px(ctx, 24, 10, 3, 5, skin)
    px(ctx, 25, handY, 3, 4, skin)
  } else {
    // arms at sides, swinging gently with walk bob
    px(ctx, 8, 14 + bob, 3, 7, skin)
    px(ctx, 8, 19 + bob, 3, 2, skinShade)
    px(ctx, 21, 14 + (1 - bob), 3, 7, skin)
    px(ctx, 21, 19 + (1 - bob), 3, 2, skinShade)
  }

  // legs (walk cycle alternation via bob)
  px(ctx, 12, 22, 4, 6, bob === 0 ? pants : pantsShade)
  px(ctx, 17, 22, 4, 6, bob === 0 ? pantsShade : pants)
  // shoes
  px(ctx, 11, 28 - bob, 5, 2, shoe)
  px(ctx, 17, 28 - (1 - bob), 5, 2, shoe)

  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  return tex
}

function makeCloudTexture() {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 16
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f4f1de'
  ctx.fillRect(4, 6, 24, 6)
  ctx.fillRect(8, 2, 16, 6)
  ctx.fillRect(0, 8, 8, 4)
  ctx.fillRect(24, 8, 8, 4)
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
    this._buildMountains(0x241b4a, 'far')
    this._buildMountains(0x1a1336, 'near')
    this._buildClouds()
    this._buildGround()
    this._buildCharacter()
    this._buildCat()
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

  _buildMountains(color, layer) {
    const points = []
    const segs = 14
    const baseY = layer === 'far' ? -0.05 : -0.25
    const amp = layer === 'far' ? 0.22 : 0.32
    for (let i = 0; i <= segs; i++) {
      const x = (i / segs) * 10 - 5
      const y = baseY + Math.sin(i * 1.3 + (layer === 'far' ? 0 : 2)) * amp * 0.5 + (i % 2 === 0 ? amp : amp * 0.4)
      points.push(new THREE.Vector2(x, y))
    }
    points.push(new THREE.Vector2(5, -1.2))
    points.push(new THREE.Vector2(-5, -1.2))
    const shape = new THREE.Shape(points)
    const geo = new THREE.ShapeGeometry(shape)
    const mat = new THREE.MeshBasicMaterial({ color })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.z = layer === 'far' ? -3 : -2
    mesh.userData.layer = layer
    mesh.userData.baseColor = new THREE.Color(color)
    this.scene.add(mesh)
    if (layer === 'far') this.mountainsFar = mesh
    else this.mountainsNear = mesh
  }

  _buildClouds() {
    const tex = makeCloudTexture()
    this.clouds = []
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85 })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(0.6, 0.3, 1)
      sprite.position.set((Math.random() - 0.5) * 9, 0.45 + Math.random() * 0.4, -4)
      sprite.userData.speed = 0.02 + Math.random() * 0.03
      sprite.userData.offset = Math.random() * 10
      this.scene.add(sprite)
      this.clouds.push(sprite)
    }
  }

  _buildGround() {
    const group = new THREE.Group()
    const tileCount = 40
    const tileW = 0.3
    for (let i = 0; i < tileCount; i++) {
      const geo = new THREE.PlaneGeometry(tileW * 0.96, 0.16)
      const shade = i % 2 === 0 ? 0x2a2046 : 0x231a3c
      const mat = new THREE.MeshBasicMaterial({ color: shade })
      const tile = new THREE.Mesh(geo, mat)
      tile.position.set(-6 + i * tileW, -0.92, -1)
      group.add(tile)
    }
    // top highlight strip
    const stripGeo = new THREE.PlaneGeometry(14, 0.03)
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x39ff9d })
    const strip = new THREE.Mesh(stripGeo, stripMat)
    strip.position.set(0, -0.84, -0.95)
    group.add(strip)
    this.ground = group
    this.scene.add(group)
  }

  _buildCharacter() {
    this.charFrames = {
      idle0: makeCharacterTexture('idle0'),
      idle1: makeCharacterTexture('idle1'),
      point0: makeCharacterTexture('point0'),
      point1: makeCharacterTexture('point1'),
    }
    const mat = new THREE.SpriteMaterial({ map: this.charFrames.idle0, transparent: true })
    this.character = new THREE.Sprite(mat)
    this.character.scale.set(0.24, 0.24, 1)
    this.character.position.set(-0.55, -0.72, 0)
    this.scene.add(this.character)
    this._charFrameTimer = 0
    this._charFrame = 0
    this.characterGesture = false
  }

  setGesture(active) {
    this.characterGesture = !!active
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
    this.dog = { position: { x: -1.4, y: -0.78 } }

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
    this.catAnchor = { x: 0.5, y: -0.79 }
  }

  // projects the (invisible) cat anchor to screen pixel coordinates for the DOM overlay.
  getCatAnchor() {
    return this._projectToScreen(this.catAnchor.x, this.catAnchor.y)
  }

  // offset up to roughly head height, for the cat's speech bubble.
  getCatHeadAnchor() {
    return this._projectToScreen(this.catAnchor.x, this.catAnchor.y + 0.18)
  }

  // the character sprite is centered on its own position (THREE.Sprite default
  // anchor), so for a speech bubble we want a point above its head, not its waist.
  getCharacterHeadAnchor() {
    return this._projectToScreen(this.character.position.x, this.character.position.y + 0.17)
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

    // theme color easing
    if (!this._curSky1) {
      this._curSky1 = new THREE.Color(this.targetTheme.sky1)
      this._curSky2 = new THREE.Color(this.targetTheme.sky2)
      this._curMountain = new THREE.Color(this.targetTheme.mountain)
    }
    this._curSky1.lerp(new THREE.Color(this.targetTheme.sky1), Math.min(1, dt * 1.5))
    this._curSky2.lerp(new THREE.Color(this.targetTheme.sky2), Math.min(1, dt * 1.5))
    this._curMountain.lerp(new THREE.Color(this.targetTheme.mountain), Math.min(1, dt * 1.5))

    this.skyMat.uniforms.colorTop.value.copy(this._curSky1)
    this.skyMat.uniforms.colorBottom.value.copy(this._curSky2)
    this.mountainsFar.material.color.copy(this._curMountain)
    this.mountainsNear.material.color.copy(this._curMountain).multiplyScalar(0.7)

    // parallax scroll driven by progress
    const scrollX = this.progress * 10
    this.mountainsFar.position.x = -((scrollX * 0.15) % 10)
    this.mountainsNear.position.x = -((scrollX * 0.35) % 10)
    this.ground.position.x = -((scrollX * 0.9) % (0.3 * 40))

    // stars twinkle + slow drift
    this.stars.material.opacity = 0.6 + Math.sin(t * 2) * 0.2
    this.stars.rotation.z = t * 0.002

    // clouds drift
    this.clouds.forEach((cl) => {
      cl.position.x -= cl.userData.speed * dt * 4
      if (cl.position.x < -6) cl.position.x = 6
    })

    // character bob/walk, or gesture toward a hovered skill
    this._charFrameTimer += dt
    const frameSpeed = this.characterGesture ? 0.4 : 0.22
    if (this._charFrameTimer > frameSpeed) {
      this._charFrameTimer = 0
      this._charFrame = 1 - this._charFrame
      const key = this.characterGesture
        ? this._charFrame === 0 ? 'point0' : 'point1'
        : this._charFrame === 0 ? 'idle0' : 'idle1'
      this.character.material.map = this.charFrames[key]
    }
    if (this.characterGesture) {
      this.character.position.y = -0.72
      this.character.position.x = -0.55
    } else {
      this.character.position.y = -0.72 + Math.abs(Math.sin(t * 6)) * 0.02
      this.character.position.x = -0.55 + Math.sin(this.progress * Math.PI * 2) * 0.08
    }

    if (!this.dogPaused) this._updateDog(dt)

    this.renderer.render(this.scene, this.camera)
  }
}
