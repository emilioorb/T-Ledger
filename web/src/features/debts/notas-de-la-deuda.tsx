import { FileText, NotebookPen } from 'lucide-react'
import { useRef, useState } from 'react'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TextoMarkdown } from '@/features/shell/texto-markdown'
import { copy } from './copy'
import { useGuardarNotas, useQuitarDocumento, useSubirDocumento } from './use-debts'

interface Props {
  debtId: string
  notes: string | null
  hasDocument: boolean
  // La versión de la deuda que se ve: guardar notas o cambiar el documento con otra da 409.
  version: number
}

// Lo que no es cifra pero hace falta tener a mano: qué dice el contrato, con quién hablar,
// qué cambia cada semestre. Se lee con formato y se edita en el mismo modal; el contrato va
// adjunto al lado, porque es de donde salen esas notas.
export const NotasDeLaDeuda = ({ debtId, notes, hasDocument, version }: Props) => {
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(notes ?? '')
  // La versión que se vio al empezar a editar: una recarga en segundo plano (al volver a la
  // pestaña) trae la de otra persona, y guardar con esa la pisaría sin 409.
  const [versionAlEditar, setVersionAlEditar] = useState(version)
  const archivo = useRef<HTMLInputElement>(null)

  const guardar = useGuardarNotas(debtId)
  const subir = useSubirDocumento(debtId)
  const quitar = useQuitarDocumento(debtId)

  const cerrar = (abrir: boolean) => {
    setAbierto(abrir)
    if (!abrir) {
      setEditando(false)
      setBorrador(notes ?? '')
    }
  }

  const confirmar = () => {
    const limpio = borrador.trim()
    guardar.mutate({ notes: limpio === '' ? null : limpio, version: versionAlEditar }, { onSuccess: () => setEditando(false) })
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => cerrar(true)}>
        <NotebookPen className="size-4" aria-hidden="true" />
        {copy.notas.open}
      </Button>

      <FormDialog
        open={abierto}
        onOpenChange={cerrar}
        title={copy.notas.title}
        description={copy.notas.hint}
        icon={NotebookPen}
        className="sm:max-w-2xl"
      >
        <div className="grid gap-5">
          {editando ? (
            <div className="space-y-1.5">
              <Label htmlFor="notas-deuda" className="sr-only">
                {copy.notas.label}
              </Label>
              <textarea
                id="notas-deuda"
                value={borrador}
                rows={14}
                onChange={(evento) => setBorrador(evento.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBorrador(notes ?? '')
                    setEditando(false)
                  }}
                >
                  {copy.notas.cancel}
                </Button>
                <Button type="button" size="sm" disabled={guardar.isPending} onClick={confirmar}>
                  {copy.notas.save}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-[50vh] overflow-y-auto text-sm">
                {notes ? (
                  <TextoMarkdown>{notes}</TextoMarkdown>
                ) : (
                  <p className="text-muted-foreground">{copy.notas.empty}</p>
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBorrador(notes ?? '')
                    setVersionAlEditar(version)
                    setEditando(true)
                  }}
                >
                  {copy.notas.edit}
                </Button>
              </div>
            </div>
          )}

          <section aria-labelledby="contrato" className="space-y-2 border-t border-border pt-4">
            <h3 id="contrato" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
              {copy.notas.document.title}
            </h3>
            {hasDocument ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/v1/debts/${debtId}/document`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium underline underline-offset-2"
                >
                  {copy.notas.document.view}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={subir.isPending}
                  onClick={() => archivo.current?.click()}
                >
                  {copy.notas.document.replace}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={quitar.isPending}
                  onClick={() => quitar.mutate(version)}
                >
                  {copy.notas.document.remove}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground">{copy.notas.document.none}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={subir.isPending}
                  onClick={() => archivo.current?.click()}
                >
                  {copy.notas.document.attach}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{copy.notas.document.hint}</p>
            <input
              ref={archivo}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(evento) => {
                const elegido = evento.target.files?.[0]
                if (elegido) subir.mutate({ archivo: elegido, version })
                evento.target.value = ''
              }}
            />
          </section>
        </div>
      </FormDialog>
    </>
  )
}
