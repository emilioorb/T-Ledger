import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/node'
import { scrub } from './scrub.js'

const evento = (extra: Partial<ErrorEvent>): ErrorEvent =>
  ({ event_id: 'a', ...extra }) as ErrorEvent

describe('scrub', () => {
  it('borra el cuerpo de la petición, que es donde viajan los montos', () => {
    const limpio = scrub(
      evento({
        request: {
          url: 'https://api.tape/api/v1/movimientos',
          method: 'POST',
          data: { amount: '4500000', description: 'Pago de la casa' },
        },
      }),
    )

    expect(limpio.request?.data).toBeUndefined()
  })

  it('borra cookies, query y cabeceras salvo las de la lista blanca', () => {
    const limpio = scrub(
      evento({
        request: {
          url: 'https://api.tape/api/v1/movimientos?buscar=alquiler',
          cookies: { session: 'abc' },
          query_string: 'buscar=alquiler',
          headers: { 'content-type': 'application/json', authorization: 'Bearer x' },
        },
      }),
    )

    expect(limpio.request?.cookies).toBeUndefined()
    expect(limpio.request?.query_string).toBeUndefined()
    expect(limpio.request?.headers).toEqual({ 'content-type': 'application/json' })
  })

  it('deja el método y la url, que es lo que sirve para ubicar el error', () => {
    const limpio = scrub(
      evento({ request: { url: 'https://api.tape/api/v1/movimientos', method: 'POST' } }),
    )

    expect(limpio.request?.url).toBe('https://api.tape/api/v1/movimientos')
    expect(limpio.request?.method).toBe('POST')
  })

  it('del usuario deja solo el id', () => {
    const limpio = scrub(
      evento({ user: { id: 'c7f3', email: 'a@b.com', ip_address: '1.2.3.4', username: 'emi' } }),
    )

    expect(limpio.user).toEqual({ id: 'c7f3' })
  })

  it('sin usuario no inventa uno', () => {
    expect(scrub(evento({})).user).toBeUndefined()
  })

  it('borra extra y los datos de las migas, que arrastran cuerpos de petición', () => {
    const limpio = scrub(
      evento({
        extra: { movimiento: { amount: '4500000' } },
        breadcrumbs: [
          { category: 'http', message: 'POST /movimientos', data: { body: { amount: '1' } } },
        ],
      }),
    )

    expect(limpio.extra).toBeUndefined()
    expect(limpio.breadcrumbs?.[0]?.data).toBeUndefined()
    expect(limpio.breadcrumbs?.[0]?.message).toBe('POST /movimientos')
  })

  it('un campo nuevo en el cuerpo no necesita que nadie lo agregue a ninguna lista', () => {
    // Esta es la prueba de que el filtro deniega por defecto. Si algún día falla, es porque
    // alguien lo cambió a una lista de campos prohibidos y la promesa se rompió.
    const limpio = scrub(
      evento({ request: { url: 'u', data: { campoQueNadieAnticipo: 'secreto' } } }),
    )

    expect(JSON.stringify(limpio)).not.toContain('secreto')
  })
})

describe('el mensaje de la excepción', () => {
  // El evento real que lo destapó: una consulta inválida a `audit_log` mandó a Sentry el
  // término que la persona había escrito en el buscador y el id de su libro, no por el
  // request —ese sí se filtraba— sino dentro del texto del error de Prisma.
  const errorDePrisma = `
Invalid \`prisma.auditLog.findMany()\` invocation:

{
  where: {
    OR: [
      { authuser: { name: { contains: "Alquiler de Juan", mode: "insensitive" } } },
      { searchText: { contains: "Alquiler de Juan", mode: "insensitive" } }
    ],
    bookId: "lib_personal_emilio"
  }
}

Unknown argument \`searchText\`. Available options are marked with ?.`.trim()

  it('deja afuera lo que la persona escribió y el libro', () => {
    const limpio = scrub(evento({ exception: { values: [{ value: errorDePrisma }] } }))
    const mensaje = limpio.exception?.values?.[0]?.value ?? ''

    expect(mensaje).not.toContain('Alquiler de Juan')
    expect(mensaje).not.toContain('lib_personal_emilio')
  })

  it('conserva qué falló y por qué, que es para lo que sirve', () => {
    const limpio = scrub(evento({ exception: { values: [{ value: errorDePrisma }] } }))
    const mensaje = limpio.exception?.values?.[0]?.value ?? ''

    expect(mensaje).toContain('prisma.auditLog.findMany()')
    expect(mensaje).toContain('Unknown argument')
  })

  it('no toca los mensajes que no traen una consulta adentro', () => {
    const limpio = scrub(evento({ exception: { values: [{ value: 'No se pudo conectar' }] } }))

    expect(limpio.exception?.values?.[0]?.value).toBe('No se pudo conectar')
  })
})
