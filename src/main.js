import './style.css'
import { PixelWorld } from './scene.js'
import avatarImgSrc from './assets/avatar.png'
import vinylGifSrc from './assets/916863c919165c049a254acdf2e4753e.gif'
import bearImgSrc from './assets/Radiohead-Logo-2000.png'

const canvas = document.getElementById('bg')
const world = new PixelWorld(canvas)

const avatarImg = document.getElementById('avatar-img')
avatarImg.src = avatarImgSrc

const vinylGif = document.getElementById('vinyl-gif')
vinylGif.src = vinylGifSrc

const bearSprites = Array.from(document.querySelectorAll('.bear-sprite'))
bearSprites.forEach((img) => {
  img.src = bearImgSrc
})

const sections = Array.from(document.querySelectorAll('.stage'))
const navButtons = Array.from(document.querySelectorAll('#hud-nav button'))
const progressFill = document.getElementById('progress-fill')
const scoreEl = document.getElementById('hud-score')
const bootScreen = document.getElementById('boot-screen')
const yearEl = document.getElementById('year')

if (yearEl) yearEl.textContent = new Date().getFullYear()

// ---------------- Boot screen dismissal ----------------
let booted = false
function dismissBoot() {
  if (booted) return
  booted = true
  bootScreen.classList.add('hidden')
  window.removeEventListener('scroll', dismissBoot)
  window.removeEventListener('keydown', dismissBoot)
  window.removeEventListener('click', dismissBoot)
}
setTimeout(dismissBoot, 4500)
window.addEventListener('scroll', dismissBoot, { passive: true })
window.addEventListener('keydown', dismissBoot)
window.addEventListener('click', dismissBoot)

// ---------------- Smooth nav ----------------
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
})

// ---------------- Reveal-on-scroll + active nav tracking ----------------
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view')
      }
    })
  },
  { threshold: 0.25 }
)
sections.forEach((s) => observer.observe(s))

let currentSectionIndex = 0
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        const id = entry.target.id
        currentSectionIndex = sections.findIndex((s) => s.id === id)
        navButtons.forEach((b) => b.classList.toggle('active', b.dataset.target === id))
      }
    })
  },
  { threshold: [0.5] }
)
sections.forEach((s) => sectionObserver.observe(s))

// ---------------- Skill hover -> avatar gesture + speech bubbles + dog pause ----------------
const speechBubble = document.getElementById('avatar-speech')
const dogSpeechBubble = document.getElementById('dog-speech')
const catSpeechBubble = document.getElementById('cat-speech')
const skillEls = document.querySelectorAll(
  '.tag, .inv-list li, .armory-item, .badge, .pipe-node'
)
skillEls.forEach((el) => {
  el.addEventListener('mouseenter', () => {
    world.setGesture(true)
    world.setDogPaused(true)
    avatarImg.classList.add('nudge')
    speechBubble.classList.add('visible')
    dogSpeechBubble.classList.add('visible')
    catSpeechBubble.classList.add('visible')
  })
  el.addEventListener('mouseleave', () => {
    world.setGesture(false)
    world.setDogPaused(false)
    avatarImg.classList.remove('nudge')
    speechBubble.classList.remove('visible')
    dogSpeechBubble.classList.remove('visible')
    catSpeechBubble.classList.remove('visible')
  })
})

// ---------------- Click a skill -> show its description in a modal ----------------
const skillModal = document.getElementById('skill-modal')
const skillModalTitle = document.getElementById('skill-modal-title')
const skillModalDesc = document.getElementById('skill-modal-desc')
const skillModalClose = document.getElementById('skill-modal-close')

function openSkillModal(el) {
  const title = el.dataset.title || el.textContent.trim()
  const desc = el.dataset.desc || ''
  if (!desc) return
  skillModalTitle.textContent = title
  skillModalDesc.textContent = desc
  skillModal.classList.add('visible')
}
function closeSkillModal() {
  skillModal.classList.remove('visible')
}

skillEls.forEach((el) => {
  el.addEventListener('click', () => openSkillModal(el))
})
skillModalClose.addEventListener('click', closeSkillModal)
skillModal.addEventListener('click', (e) => {
  if (e.target === skillModal) closeSkillModal()
})
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSkillModal()
})

// ---------------- Cat overlay position (smooth SVG, tracks the world anchor) ----------------
const catIllustration = document.getElementById('cat-illustration')
function updateCatPosition() {
  const anchor = world.getCatAnchor()
  catIllustration.style.left = `${anchor.x}px`
  catIllustration.style.top = `${anchor.y}px`
  const headAnchor = world.getCatHeadAnchor()
  catSpeechBubble.style.left = `${headAnchor.x}px`
  catSpeechBubble.style.top = `${headAnchor.y}px`
}
window.addEventListener('resize', updateCatPosition)

// ---------------- Desk prop overlay position (static, tracks the world anchor) ----------------
const deskProp = document.getElementById('desk-prop')
const nowPlaying = document.getElementById('now-playing')
function updateDeskPropPosition() {
  const anchor = world.getDeskPropAnchor()
  deskProp.style.left = `${anchor.x}px`
  deskProp.style.top = `${anchor.y}px`
  const labelAnchor = world.getDeskPropLabelAnchor()
  nowPlaying.style.left = `${labelAnchor.x}px`
  nowPlaying.style.top = `${labelAnchor.y}px`
}
window.addEventListener('resize', updateDeskPropPosition)

// ---------------- Scroll progress -> scene + HUD ----------------
function onScroll() {
  const scrollTop = window.scrollY
  const max = document.documentElement.scrollHeight - window.innerHeight
  const progress = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0

  progressFill.style.width = `${progress * 100}%`
  scoreEl.textContent = `SCORE ${String(Math.floor(progress * 999999)).padStart(6, '0')}`

  world.setProgress(progress, currentSectionIndex)
}
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

// ---------------- Animation loop ----------------
const dogIllustration = document.getElementById('dog-illustration')
const avatarIllustration = document.getElementById('avatar-illustration')
function tick() {
  world.update()

  const charAnchor = world.getCharacterAnchor()
  avatarIllustration.style.left = `${charAnchor.x}px`
  avatarIllustration.style.top = `${charAnchor.y}px`

  const dogAnchor = world.getDogAnchor()
  dogIllustration.style.left = `${dogAnchor.x}px`
  dogIllustration.style.top = `${dogAnchor.y}px`
  dogIllustration.dataset.pose = world.getDogPose()

  const dogHeadAnchor = world.getDogHeadAnchor()
  dogSpeechBubble.style.left = `${dogHeadAnchor.x}px`
  dogSpeechBubble.style.top = `${dogHeadAnchor.y}px`

  const charHeadAnchor = world.getCharacterHeadAnchor()
  speechBubble.style.left = `${charHeadAnchor.x}px`
  speechBubble.style.top = `${charHeadAnchor.y}px`

  const bearAnchors = world.getBearAnchors()
  bearSprites.forEach((img, i) => {
    const anchor = bearAnchors[i]
    img.style.left = `${anchor.x}px`
    img.style.top = `${anchor.y}px`
    img.style.opacity = anchor.opacity
    img.style.transform = `translate(-50%, -50%) scale(${anchor.scale})`
  })

  requestAnimationFrame(tick)
}
updateCatPosition()
updateDeskPropPosition()
tick()
