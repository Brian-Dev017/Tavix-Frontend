import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Inyecta tokens y mixins en cada bloque <style lang="scss"> automáticamente
        additionalData: `
          @use "@/assets/styles/tokens" as *;
          @use "@/assets/styles/mixins" as *;
        `
      }
    }
  },
  server: {
    port: 5173
  }
})
