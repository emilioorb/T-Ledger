import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// El fondo de los íconos que el sistema recorta (Android en círculo, iOS en cuadrado
// redondeado) es el mismo negro del logo: con el blanco por defecto quedaría un aro claro.
const fondoDelLogo = { background: '#0e0c0a' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: fondoDelLogo },
    apple: { ...minimal2023Preset.apple, resizeOptions: fondoDelLogo },
  },
  images: ['public/favicon.svg'],
})
