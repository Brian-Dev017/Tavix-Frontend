import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import 'primeicons/primeicons.css'
import '@/assets/styles/global.scss'

import App from './App.vue'
import router from './shared/router/index'

// Preset personalizado: paleta rose como primaria, sage como secundaria
const TavixxPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#fdf2f6',
      100: '#fce7ef',
      200: '#f9cee0',
      300: '#f4a6c6',
      400: '#e8809f', // $amber-light / hover
      500: '#D67B93', // $amber / base
      600: '#C8517A', // $amber-dark / press
      700: '#a83f62',
      800: '#8c3250',
      900: '#742d44',
      950: '#4a1528',
    },
    colorScheme: {
      light: {
        surface: {
          0:   '#ffffff',
          50:  '#f9f8f7',
          100: '#f3f0ee',
          200: '#ede9e6',
          300: '#d9d3ce',
          400: '#c4bcb7',
          500: '#9ca3af',
          600: '#6b7280',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#0a0f1a',
        },
      },
    },
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: TavixxPreset,
    options: { darkModeSelector: '.dark-mode' }
  }
})
app.use(ToastService)
app.use(ConfirmationService)

app.mount('#app')

