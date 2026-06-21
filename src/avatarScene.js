import * as THREE from 'three'

// A small, deliberately simple Three.js scene: a developer at a desk (monitor,
// chair) built from basic primitives with real lighting. Kept intentionally
// low-detail (no glasses/beard/headset) since those didn't read well at this
// size — simple shapes, clearly visible, is the priority here.
//
// Coordinate scheme: the character faces -X (toward the monitor). Left/right
// (shoulders, hands, knees) spreads along Z. The chair sits behind at +X.
export class AvatarScene {
  constructor(canvas) {
    this.canvas = canvas
    this.clock = new THREE.Clock()
    this.gesture = false

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50)
    this.camera.position.set(-0.3, 1.5, 2.4)
    this.camera.lookAt(-0.15, 0.85, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 0.7)
    const key = new THREE.DirectionalLight(0xfff4e0, 0.9)
    key.position.set(-1, 4, 3)
    const fill = new THREE.DirectionalLight(0x9fc8ff, 0.4)
    fill.position.set(2, 1.5, -1)
    this.scene.add(ambient, key, fill)

    this._buildDesk()
    this._buildChair()
    this._buildCharacter()

    this._resize()
    window.addEventListener('resize', () => this._resize())
  }

  _resize() {
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  _mesh(geo, color, x, y, z, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.75,
      metalness: 0.05,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    })
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    if (opts.rot) m.rotation.set(...opts.rot)
    this.scene.add(m)
    return m
  }

  _box(w, h, d, color, x, y, z, opts) {
    return this._mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, opts)
  }

  _sphere(r, color, x, y, z, opts) {
    return this._mesh(new THREE.SphereGeometry(r, 16, 12), color, x, y, z, opts)
  }

  _capsule(r, len, color, x, y, z, opts) {
    return this._mesh(new THREE.CapsuleGeometry(r, len, 4, 10), color, x, y, z, opts)
  }

  _cylinder(rt, rb, h, color, x, y, z, opts) {
    return this._mesh(new THREE.CylinderGeometry(rt, rb, h, 16), color, x, y, z, opts)
  }

  _buildDesk() {
    const deskTopY = 0.78
    this._box(1.0, 0.06, 0.7, 0x3a3a3e, -0.05, deskTopY, 0)
    this._box(0.05, 0.75, 0.05, 0x2a2a2e, -0.45, deskTopY / 2, 0.28)
    this._box(0.05, 0.75, 0.05, 0x2a2a2e, -0.45, deskTopY / 2, -0.28)

    // monitor: the screen box has real depth and is emissive on every face,
    // so it reads as a glowing rectangle from any camera angle (a paper-thin
    // box only shows its glow when viewed dead-on, which looked like a line).
    this._cylinder(0.13, 0.15, 0.02, 0x222226, -0.35, deskTopY + 0.01, -0.1)
    this._cylinder(0.02, 0.02, 0.22, 0x2a2a2e, -0.35, deskTopY + 0.12, -0.1)
    this._box(0.42, 0.28, 0.06, 0x1c1c1f, -0.35, deskTopY + 0.32, -0.1)
    this.screen = this._box(0.36, 0.22, 0.03, 0x123a52, -0.35, deskTopY + 0.32, -0.1, {
      emissive: 0x123a52,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    })

    // keyboard, close to the character's side of the desk
    this._box(0.3, 0.025, 0.13, 0x1c1c1e, 0.2, deskTopY + 0.015, 0)
  }

  _buildChair() {
    this._box(0.46, 0.7, 0.08, 0x181818, 0.9, 0.95, -0.05)
    this._box(0.42, 0.06, 0.4, 0x1c1c1e, 0.62, 0.6, 0)
    this._cylinder(0.04, 0.04, 0.5, 0x2a2a2e, 0.75, 0.32, -0.05)
    this._cylinder(0.22, 0.26, 0.04, 0x141414, 0.75, 0.04, -0.05)
  }

  _buildCharacter() {
    const skin = 0xe8b98a
    const sweater = 0xa89c4a
    const denim = 0x3a3d42
    const shoe = 0x141414
    const hair = 0x5a4226

    // legs: clearly out in the open between the chair and desk, not tucked
    // away behind other geometry — thighs resting on the seat, shins straight
    // down to the floor, feet flat on the ground.
    this._capsule(0.09, 0.18, denim, 0.34, 0.6, 0.13, { rot: [0, 0, Math.PI / 2] })
    this._capsule(0.09, 0.18, denim, 0.34, 0.6, -0.13, { rot: [0, 0, Math.PI / 2] })
    this._capsule(0.08, 0.34, denim, 0.13, 0.3, 0.13)
    this._capsule(0.08, 0.34, denim, 0.13, 0.3, -0.13)
    this._box(0.2, 0.08, 0.14, shoe, 0.13, 0.05, 0.13)
    this._box(0.2, 0.08, 0.14, shoe, 0.13, 0.05, -0.13)

    // torso: a vertical capsule reads as rounded shoulders/waist, not a brick
    this.torso = this._capsule(0.22, 0.28, sweater, 0.5, 1.0, 0)

    // arms: simple capsules from shoulder to a hand resting near the keyboard
    this.armL = this._capsule(0.07, 0.34, sweater, 0.28, 0.86, 0.18, { rot: [0, 0, -0.7] })
    this.armR = this._capsule(0.07, 0.34, sweater, 0.28, 0.86, -0.18, { rot: [0, 0, -0.7] })
    this.handL = this._sphere(0.07, skin, 0.16, 0.79, 0.18)
    this.handR = this._sphere(0.07, skin, 0.16, 0.79, -0.18)

    // neck + head
    this._cylinder(0.07, 0.08, 0.08, skin, 0.5, 1.3, 0)
    this.head = new THREE.Group()
    this.head.position.set(0.5, 1.43, 0)
    this.scene.add(this.head)

    this.head.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 20, 16),
        new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 })
      )
    )

    // simple cropped hair: a cap that stays well clear of the eyeline
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.195, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.4),
      new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 })
    )
    hairCap.position.set(0, 0.07, 0)
    this.head.add(hairCap)

    // small, simple eyes — flattened dark spheres, not a black slab
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.4 })
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), eyeMat)
    eyeL.position.set(-0.17, 0.0, 0.07)
    this.head.add(eyeL)
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), eyeMat)
    eyeR.position.set(-0.17, 0.0, -0.07)
    this.head.add(eyeR)
  }

  setGesture(active) {
    this.gesture = !!active
  }

  update() {
    const dt = this.clock.getDelta()
    const t = this.clock.elapsedTime

    // idle typing hands + screen glow pulse
    if (this.armL) this.armL.rotation.z = -0.7 + Math.sin(t * 5) * 0.04
    if (this.armR) this.armR.rotation.z = -0.7 + Math.sin(t * 5 + Math.PI) * 0.04
    this.screen.material.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.1

    // gesture: glance over toward the viewer when a skill is hovered
    const targetY = this.gesture ? 0.6 : 0
    this.head.rotation.y += (targetY - this.head.rotation.y) * Math.min(1, dt * 6)

    this.renderer.render(this.scene, this.camera)
  }
}
