import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ChevronsUpDownIcon,
  CompassIcon,
  LogOutIcon,
  MoonIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  LifeBuoyIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { copy } from '@/features/debts/copy'
import { copy as shell } from '@/features/shell/copy'
import { copy as auditoria } from '@/features/auditoria/copy'
import { copy as libroCopy } from '@/features/libro/copy'
import { copy as guide } from '@/features/shell/guide-copy'
import {
  signOut,
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from '@/features/identity/auth-client'
import { olvidarQuienEra } from '@/lib/observability'
import { queryClient } from '@/router'
import { applyTheme, resolver, tema as ajusteDeTema } from '@/lib/theme'

interface Props {
  name: string
  subtitle: string
}

const Identity = ({ name, subtitle }: Props) => (
  <>
    <Avatar className="size-8 rounded-md after:rounded-md">
      <AvatarFallback className="rounded-md text-xs font-semibold">
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="grid flex-1 text-left leading-tight">
      <span className="truncate text-sm font-medium">{name}</span>
      <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
    </div>
  </>
)

export const NavUser = () => {
  const { isMobile } = useSidebar()
  const preferencia = ajusteDeTema.usar()
  const { data: sesion, isPending } = useSession()
  const { data: activo } = useActiveOrganization()
  const { data: libros } = useListOrganizations()

  // El subtítulo dice en qué libro estás parado. Si todavía no elegiste uno y tenés uno solo,
  // se muestra ese: es el mismo criterio con el que el servidor resuelve la petición cuando
  // no llega la cabecera del libro, y mostrar «Sin libro» mientras el servidor sí está
  // usando uno sería mentirle a la pantalla.
  // El rol sale de la membresía en el libro activo. El registro de auditoría dice quién tocó
  // qué —información sobre las personas, no sobre la plata—, así que solo lo ve quien
  // administra a la gente. El servidor lo hace cumplir igual: esto es para no ofrecer una
  // puerta que va a contestar 403.
  const esDuenno = activo?.members?.some(
    (miembro) => miembro.userId === sesion?.user.id && miembro.role === 'owner',
  )

  const libro = activo ?? (libros?.length === 1 ? libros[0] : null)
  const name = sesion?.user.name ?? ''
  const subtitle = libro?.name ?? shell.nav.noBook

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton className="h-12 w-full" aria-label={shell.nav.loadingSession} />
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Sin sesión no hay identidad que mostrar ni sesión que cerrar. Quien llegue acá sin
  // sesión va a ser mandado a la pantalla de entrar; mientras tanto, un menú de usuario
  // vacío sería un control que promete algo que no puede cumplir.
  if (!sesion) return null

  // Cerrar sesión no es solo soltar la cookie. La caché de TanStack Query guarda los saldos,
  // los movimientos y las metas de quien acaba de salir: sin vaciarla, el que entre después
  // en esta misma pantalla ve la plata del anterior hasta que cada consulta se refresque.
  // Y Sentry deja de saber quién es, porque a partir de acá ya no es nadie.
  //
  // Todo eso va en `onSuccess` y no después del `await`: si el servidor no pudo cerrar la
  // sesión, la cookie sigue viva, y vaciar la pantalla ahí le haría creer a la persona que
  // salió cuando en realidad sigue adentro.
  const cerrarSesion = () =>
    signOut({
      fetchOptions: {
        onSuccess: () => {
          queryClient.clear()
          olvidarQuienEra()
          // Recarga completa a propósito: es la única forma de garantizar que no quede nada
          // de la persona anterior en memoria, ni en un estado de React ni en un módulo.
          window.location.assign('/')
        },
        onError: () => {
          toast.error(shell.nav.signOutFailed)
        },
      },
    })

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Identity name={name} subtitle={subtitle} />
              <ChevronsUpDownIcon className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">
                <Identity name={name} subtitle={subtitle} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/cuenta">
                <UserIcon aria-hidden="true" />
                {shell.nav.account}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link to="/libro">
                <UsersIcon aria-hidden="true" />
                {libroCopy.title}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link to="/guia">
                <CompassIcon aria-hidden="true" />
                {guide.guide.title}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link to="/novedades">
                <ScrollTextIcon aria-hidden="true" />
                {shell.nav.releases}
              </Link>
            </DropdownMenuItem>

            {esDuenno ? (
              <DropdownMenuItem asChild>
                <Link to="/auditoria">
                  <ShieldCheckIcon aria-hidden="true" />
                  {auditoria.audit.title}
                </Link>
              </DropdownMenuItem>
            ) : null}

            {/* Soporte cierra el bloque y va aparte: los de arriba son lugares de la
                aplicación, y este manda a escribirle a una persona. */}
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              {/* Un correo y no un formulario: del otro lado hay alguien, y su dirección ya
                  está escrita en la pantalla de entrar. El asunto va puesto para que el
                  mensaje llegue diciendo de qué es. */}
              <a
                href={`mailto:${shell.nav.supportEmail}?subject=${encodeURIComponent(shell.nav.supportSubject)}`}
              >
                <LifeBuoyIcon aria-hidden="true" />
                {shell.nav.support}
              </a>
            </DropdownMenuItem>

            {/* El tema va último y separado: es una preferencia de la aplicación, no un
                lugar al que se va. Una sola fila, porque la elección es binaria y el rótulo
                dice a qué se cambia, no dónde se está. */}
            <DropdownMenuSeparator />

            {/* Alterna sobre el tema que se está viendo, no sobre la preferencia: con «el del
                sistema» elegido, lo que la persona quiere del atajo es lo contrario de lo que
                tiene delante. Las tres opciones viven en la pantalla de cuenta. */}
            <DropdownMenuItem
              onSelect={() => applyTheme(resolver(preferencia) === 'dark' ? 'light' : 'dark')}
            >
              {resolver(preferencia) === 'dark' ? (
                <SunIcon aria-hidden="true" />
              ) : (
                <MoonIcon aria-hidden="true" />
              )}
              {resolver(preferencia) === 'dark' ? copy.nav.lightTheme : copy.nav.darkTheme}
            </DropdownMenuItem>

            {/* Salir va al fondo y con su propia separación: es lo único del menú que termina
                algo, y pegado al resto se toca sin querer. */}
            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => void cerrarSesion()}>
              <LogOutIcon aria-hidden="true" />
              {shell.nav.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
