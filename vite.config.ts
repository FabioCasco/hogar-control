import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const githubBase = repositoryName && !repositoryName.endsWith('.github.io')
  ? `/${repositoryName}/`
  : '/'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? githubBase : '/',
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
})
