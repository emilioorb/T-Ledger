import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/prisma/prisma.module.js'
import { RASTRO } from './domain/rastro.port.js'
import { PrismaRastroRepository } from './infrastructure/prisma-rastro.repository.js'

// Solo la escritura del rastro, para que la importen los módulos que registran cambios.
//
// Está separado de `AuditoriaModule` —que trae el endpoint de lectura— porque los dependientes
// son otros: contabilidad, deudas, metas, inversiones y presupuesto necesitan escribir, y
// ninguno necesita el controlador.
//
// No es `@Global`, aunque lo use medio proyecto. Un proveedor global se resuelve solo cuando
// alguien importó el módulo raíz, así que los tests que arman un módulo con su dominio y nada
// más fallaban con «Nest can't resolve Symbol(Rastro)» —la dependencia existía pero no estaba
// declarada—. Lo que el `@Global` pretendía evitar, que un módulo nuevo se olvide de registrar
// sus cambios, lo cuida mejor `cobertura-de-rastro.spec.ts`, que lo comprueba archivo por
// archivo en vez de confiar en la inyección.
@Module({
  imports: [PrismaModule],
  providers: [{ provide: RASTRO, useClass: PrismaRastroRepository }],
  exports: [RASTRO],
})
export class RastroModule {}
