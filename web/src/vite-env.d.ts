/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

// Los inyecta vite.config desde package.json y la fecha del build: sin esto, la versión
// habría que escribirla a mano en el pie y quedaría vieja al primer despliegue.
declare const __APP_VERSION__: string
declare const __BUILD_YEAR__: string
