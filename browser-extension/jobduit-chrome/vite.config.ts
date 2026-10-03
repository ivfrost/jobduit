import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const manifest = JSON.parse(
	readFileSync(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), crx({ manifest }), tailwindcss()],
})
