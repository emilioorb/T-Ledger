import { CintaContable } from './cinta-contable'
import { copy } from './copy'

// La mitad derecha de la pantalla de entrar. En un producto empresarial acá va un testimonio
// y tres sellos de certificación; acá no, porque T-Ledger todavía no tiene usuarios que
// citar ni auditorías que mostrar, y ponerlos sería abrir la relación con una mentira.
//
// Lo que sí tiene es su propia cinta: el rollo ocupa el panel entero y la frase va al pie,
// donde el bloque de ejemplo pone la cita. El orden importa —primero se ve la contabilidad
// corriendo, después se lee qué es— porque al revés la frase sería una promesa y así es un
// epígrafe.
export const PanelDeConfianza = () => (
  // Sin fondo propio: el campo de puntos vive detrás de toda la página y la tarjeta flota
  // encima. Meterle otro fondo acá sería una capa de más peleando con la de abajo.
  <aside className="hidden border-l border-border lg:block">
    <div className="flex h-full flex-col">
      <CintaContable />

      <div className="border-t border-border px-6 py-6 2xl:px-10 2xl:py-8">
        <p className="max-w-[26ch] text-lg leading-snug font-medium tracking-tight text-balance 2xl:text-xl">
          {copy.panel.title}
        </p>
        <p className="mt-2 max-w-[40ch] text-sm text-muted-foreground 2xl:mt-3">
          {copy.panel.subtitle}
        </p>
      </div>
    </div>
  </aside>
)
