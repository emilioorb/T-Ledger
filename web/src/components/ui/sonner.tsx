import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useCurrentTheme } from "@/lib/use-current-theme"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  // next-themes no tiene provider en este proyecto: el tema sale de data-theme.
  const theme = useCurrentTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--raised)",
          "--normal-text": "var(--text)",
          "--normal-border": "var(--border-subtle)",
          "--error-bg": "var(--raised)",
          "--error-text": "var(--negative)",
          "--error-border": "var(--border-subtle)",
          "--success-bg": "var(--raised)",
          "--success-text": "var(--positive)",
          "--success-border": "var(--border-subtle)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
