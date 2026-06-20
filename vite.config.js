import { defineConfig } from 'vite'

// If deploying to https://<user>.github.io/<repo>/ (a project page rather than
// a username.github.io root site), set base to '/<repo>/' instead of '/'.
export default defineConfig({
  base: '/',
})
