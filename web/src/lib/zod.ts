import { z } from 'zod'

// La CSP no permite eval. Sin esto, Zod prueba `new Function` para compilar los esquemas y cada
// prueba deja una violación en la consola, aunque después valide igual sin compilar.
z.config({ jitless: true })

export { z }
