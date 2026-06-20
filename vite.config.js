import { defineConfig } from 'vite'

// This repo is named exactly "dimpapadev" (the GitHub username), which makes
// GitHub render its README.md on the profile page — but Pages still serves it
// at https://dimpapadev.github.io/dimpapadev/ (a sub-path), since only a repo
// literally named "<user>.github.io" gets the root domain.
export default defineConfig({
  base: '/dimpapadev/',
})
