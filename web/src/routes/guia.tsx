import { useState, type ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  Banknote,
  BookOpen,
  CalendarCheck,
  Compass,
  FolderTree,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  PiggyBank,
  Receipt,
  Scale,
  Tags,
  Target,
  Upload,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { copy as accounting } from '@/features/accounting/copy'
import { copy as banking } from '@/features/banking/copy'
import { copy as budget } from '@/features/budget/copy'
import { copy as debts } from '@/features/debts/copy'
import { copy as goals } from '@/features/goals/copy'
import { copy as investments } from '@/features/investments/copy'
import { copy as projection } from '@/features/projection/copy'
import { copy as shell } from '@/features/shell/copy'
import { copy as guideCopy } from '@/features/shell/guide-copy'
import { filterRows } from '@/lib/use-table-controls'
import { TEXT_LINK } from '@/components/text-link'
import { cn } from '@/lib/utils'

const guide = guideCopy.guide

interface GuideEntry {
  purpose: string
  steps: readonly string[]
  notes: readonly string[]
}

interface GuideModule extends GuideEntry {
  id: string
  title: string
  to: string
  icon: LucideIcon
}

interface GuideGroup {
  id: string
  label: string
  modules: GuideModule[]
}

// El nombre, la ruta y el icono salen de las mismas fuentes que la barra lateral. Una guía
// que nombrara las pantallas a su manera dejaría de servir como mapa.
const GROUPS: GuideGroup[] = [
  {
    id: 'panel',
    label: guide.groups.home,
    modules: [
      {
        id: 'panel',
        title: shell.nav.dashboard,
        to: '/',
        icon: LayoutDashboard,
        ...guide.modules.dashboard,
      },
    ],
  },
  {
    id: 'dinero',
    label: debts.nav.section,
    modules: [
      {
        id: 'deudas',
        title: debts.nav.debts,
        to: '/deudas',
        icon: Receipt,
        ...guide.modules.debts,
      },
      {
        id: 'plan-de-pago',
        title: debts.nav.payoffPlan,
        to: '/plan-de-pago',
        icon: ListOrdered,
        ...guide.modules.payoffPlan,
      },
    ],
  },
  {
    id: 'plan',
    label: budget.nav.section,
    modules: [
      {
        id: 'presupuesto',
        title: budget.nav.budget,
        to: '/presupuesto',
        icon: Wallet,
        ...guide.modules.budget,
      },
      {
        id: 'modelos',
        title: budget.nav.models,
        to: '/presupuesto/modelos',
        icon: Wallet,
        ...guide.modules.budgetModels,
      },
      {
        id: 'metas',
        title: goals.goals.title,
        to: '/metas',
        icon: Target,
        ...guide.modules.goals,
      },
      {
        id: 'inversiones',
        title: investments.investments.title,
        to: '/inversiones',
        icon: PiggyBank,
        ...guide.modules.investments,
      },
      {
        id: 'proyeccion',
        title: projection.projection.title,
        to: '/proyeccion',
        icon: LineChart,
        ...guide.modules.projection,
      },
    ],
  },
  {
    id: 'contabilidad',
    label: accounting.nav.section,
    modules: [
      {
        id: 'movimientos',
        title: accounting.nav.movements,
        to: '/contabilidad/movimientos',
        icon: Receipt,
        ...guide.modules.movements,
      },
      {
        id: 'asientos',
        title: accounting.nav.journal,
        to: '/contabilidad/asientos',
        icon: BookOpen,
        ...guide.modules.journal,
      },
      // Los cinco reportes cuelgan del mismo ítem en la navegación, así que llevan su icono.
      {
        id: 'patrimonio',
        title: accounting.nav.netWorth,
        to: '/contabilidad/patrimonio',
        icon: Scale,
        ...guide.modules.netWorth,
      },
      {
        id: 'comprobacion',
        title: accounting.nav.trialBalance,
        to: '/contabilidad/comprobacion',
        icon: Scale,
        ...guide.modules.trialBalance,
      },
      {
        id: 'mayor',
        title: accounting.nav.ledger,
        to: '/contabilidad/mayor',
        icon: Scale,
        ...guide.modules.ledger,
      },
      {
        id: 'situacion',
        title: accounting.nav.financialPosition,
        to: '/contabilidad/situacion',
        icon: Scale,
        ...guide.modules.financialPosition,
      },
      {
        id: 'resultados',
        title: accounting.nav.incomeStatement,
        to: '/contabilidad/resultados',
        icon: Scale,
        ...guide.modules.incomeStatement,
      },
      {
        id: 'plan-de-cuentas',
        title: accounting.nav.accounts,
        to: '/contabilidad/cuentas',
        icon: FolderTree,
        ...guide.modules.accounts,
      },
      {
        id: 'categorias',
        title: accounting.nav.categories,
        to: '/contabilidad/categorias',
        icon: Tags,
        ...guide.modules.categories,
      },
      {
        id: 'cierre',
        title: accounting.nav.closing,
        to: '/contabilidad/cierre',
        icon: CalendarCheck,
        ...guide.modules.closing,
      },
    ],
  },
  {
    id: 'banco',
    label: banking.nav.section,
    modules: [
      {
        id: 'conciliacion',
        title: banking.nav.reconciliation,
        to: '/banco/conciliacion',
        icon: Scale,
        ...guide.modules.reconciliation,
      },
      {
        id: 'importar',
        title: banking.nav.import,
        to: '/banco/importar',
        icon: Upload,
        ...guide.modules.bankImport,
      },
      {
        id: 'cuentas-bancarias',
        title: banking.accounts.title,
        to: '/banco/cuentas',
        icon: Banknote,
        ...guide.modules.bankAccounts,
      },
    ],
  },
]

// Buscar por nombre no alcanza: quien no sabe cómo se llama la pantalla la busca por lo
// que hace, que es justamente lo que la guía explica.
const searchableOf = (module: GuideModule): string =>
  [module.title, module.purpose, ...module.steps, ...module.notes].join(' ')

const BASICS_SEARCHABLE = [
  guide.basics.title,
  guide.basics.intro,
  ...guide.basics.concepts.flatMap((concept) => [concept.term, concept.text]),
  guide.basics.start.label,
  ...guide.basics.start.steps.map((step) => step.text),
].join(' ')

// El copy marca con ** el texto exacto del control que hay que buscar en pantalla. Vive en
// el copy y no en el JSX porque el énfasis cae sobre una palabra, no sobre la frase entera.
const withControls = (text: string): ReactNode[] =>
  text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 0 ? (
      part
    ) : (
      <strong key={part + String(index)} className="font-medium">
        {part}
      </strong>
    ),
  )

const Block = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <h3 className="text-xs text-muted-foreground">{label}</h3>
    <div className="mt-1.5 text-sm">{children}</div>
  </div>
)

// El número va en su propia columna para que las líneas de dos renglones no se metan
// debajo de él: una lista de pasos que no se puede recorrer con la vista no es una lista.
const Steps = ({ steps }: { steps: readonly string[] }) => (
  <ol className="space-y-1.5">
    {steps.map((step, index) => (
      <li key={step} className="grid grid-cols-[1.25rem_1fr] gap-x-2">
        <span className="num text-muted-foreground tabular-nums">{index + 1}.</span>
        <span>{withControls(step)}</span>
      </li>
    ))}
  </ol>
)

const Notes = ({ notes }: { notes: readonly string[] }) => (
  <ul className="ml-4 list-disc space-y-1.5 marker:text-muted-foreground">
    {notes.map((note) => (
      <li key={note}>{withControls(note)}</li>
    ))}
  </ul>
)

const ModuleSection = ({ module, group }: { module: GuideModule; group?: string }) => (
  <section id={module.id} className="scroll-mt-4 space-y-4">
    <div className="space-y-1">
      {group ? <p className="text-xs text-muted-foreground">{group}</p> : null}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
          <module.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {module.title}
        </h2>
        <Link
          to={module.to}
          aria-label={guide.openOf(module.title)}
          className={cn('shrink-0 text-xs', TEXT_LINK)}
        >
          {guide.open}
        </Link>
      </div>
    </div>

    <div className="max-w-[70ch] space-y-4">
      <Block label={guide.parts.purpose}>
        <p>{module.purpose}</p>
      </Block>
      <Block label={guide.parts.steps}>
        <Steps steps={module.steps} />
      </Block>
      <Block label={guide.parts.notes}>
        <Notes notes={module.notes} />
      </Block>
    </div>
  </section>
)

// La primera sección no documenta una pantalla: explica las ideas sin las cuales el resto
// de la guía sería vocabulario prestado.
const BasicsSection = () => (
  <section id={guide.basics.id} className="scroll-mt-4 space-y-4">
    <h2 className="flex items-center gap-2 text-base font-medium tracking-tight">
      <Compass className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {guide.basics.title}
    </h2>

    <div className="max-w-[70ch] space-y-4">
      <p className="text-sm">{guide.basics.intro}</p>

      <dl className="space-y-3">
        {guide.basics.concepts.map((concept) => (
          <div key={concept.term}>
            <dt className="text-sm font-medium">{concept.term}</dt>
            <dd className="mt-0.5 text-sm">{concept.text}</dd>
          </div>
        ))}
      </dl>

      <Block label={guide.basics.start.label}>
        <ol className="space-y-1.5">
          {guide.basics.start.steps.map((step, index) => (
            <li key={step.text} className="grid grid-cols-[1.25rem_1fr] gap-x-2">
              <span className="num text-muted-foreground tabular-nums">{index + 1}.</span>
              <span>
                {withControls(step.text)}{' '}
                <a href={`#${step.to}`} className={cn('text-xs', TEXT_LINK)}>
                  {step.link}
                </a>
              </span>
            </li>
          ))}
        </ol>
      </Block>
    </div>
  </section>
)

const GuideScreen = () => {
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0

  // Un grupo que se queda sin módulos no se muestra: un encabezado sobre nada sería ruido.
  const groups = GROUPS.map((group) => ({
    ...group,
    modules: filterRows(group.modules, searchableOf, query),
  })).filter((group) => group.modules.length > 0)

  const showBasics = filterRows([BASICS_SEARCHABLE], (text) => text, query).length > 0
  const matches = groups.reduce((total, group) => total + group.modules.length, 0)
  const nothing = !showBasics && groups.length === 0

  return (
    <section className="space-y-6">
      <header className="max-w-[65ch]">
        <h1 className="text-xl font-semibold tracking-tight">{guide.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{guide.description}</p>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={guide.search.placeholder}
          label={guide.search.label}
        />
        {searching ? (
          <p className="text-xs text-muted-foreground" role="status">
            {guide.matches(matches)}
          </p>
        ) : null}
      </div>

      {nothing ? (
        <EmptyState
          title={guide.empty.title}
          description={guide.empty.description}
          action={
            <Button size="sm" variant="outline" onClick={() => setQuery('')}>
              {guide.empty.action}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
          {/* El índice es la única parte que se repite: bajo lg desaparece y el contenido,
              que ya está en orden, hace de índice por sí solo. */}
          <nav
            aria-label={guide.index}
            className="hidden text-sm lg:sticky lg:top-0 lg:block lg:self-start"
          >
            <ul className="space-y-4">
              {showBasics ? (
                <li>
                  <a
                    href={`#${guide.basics.id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {guide.basics.title}
                  </a>
                </li>
              ) : null}

              {groups.map((group) => (
                <li key={group.id}>
                  <p className="text-xs text-muted-foreground">{group.label}</p>
                  <ul className="mt-1 space-y-1">
                    {group.modules.map((module) => (
                      <li key={module.id}>
                        <a
                          href={`#${module.id}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {module.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-10">
            {showBasics ? <BasicsSection /> : null}
            {groups.flatMap((group) =>
              group.modules.map((module, index) => (
                <ModuleSection
                  key={module.id}
                  module={module}
                  group={index === 0 ? group.label : undefined}
                />
              )),
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export const Route = createFileRoute('/guia')({ component: GuideScreen })
