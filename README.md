# DIMITRIOS.EXE — 8-Bit Dev Profile

An interactive, 8-bit / retro-game styled developer bio page. Scroll
through it like levels in a side-scroller: a Three.js pixel-art world
(parallax mountains, twinkling stars, drifting clouds, a walking hero
sprite, and a roaming pixel dog that periodically stops to sit and
lick its paws) reacts to scroll position while each section tells part
of the story — about, career, tech stack, quality practices, Azure
cloud/DevOps, the Azure services arsenal, infrastructure, and contact.

## Stack

- [Vite](https://vite.dev/) — dev server & build
- [Three.js](https://threejs.org/) — low-res pixel-rendered WebGL scene
- Vanilla JS/CSS — no framework, `Press Start 2P` + `VT323` fonts for
  the retro look, CSS scanlines/vignette for a CRT feel

## Develop

```bash
npm install
npm run dev
```

Open the printed local URL. Scroll (or press any key) to dismiss the
boot screen and walk through the levels. Use the HUD nav buttons to
jump between sections.

## Build

```bash
npm run build
npm run preview   # sanity-check the production build locally
```

## Deploy to GitHub Pages

A workflow at [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
builds and deploys `dist/` to GitHub Pages on every push to `main`.

1. In the repo settings, set **Pages → Build and deployment → Source**
   to **GitHub Actions**.
2. If this site lives at `https://<user>.github.io/<repo>/` (a project
   page, not a `<user>.github.io` root repo), update `base` in
   [vite.config.js](vite.config.js) to `'/<repo>/'`.
3. Push to `main` — the workflow builds and publishes automatically.

## Customizing

- **Content**: edit the sections in [index.html](index.html) — each
  `<section class="stage">` is one "level".
- **Theme colors per level**: `THEMES` array in [src/scene.js](src/scene.js).
- **Pixel density**: `pixelRatioScale` in `PixelWorld` (src/scene.js) —
  lower = chunkier pixels.
- **Contact links**: update the email/GitHub/LinkedIn links in the
  `#contact` section of [index.html](index.html).
