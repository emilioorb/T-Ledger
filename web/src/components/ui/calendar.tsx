import * as React from "react"
import { cn } from "cn"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { es } from "react-day-picker/locale"

import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn("relative w-fit", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-medium tracking-tight capitalize",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-7 text-muted-foreground hover:text-foreground"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-7 text-muted-foreground hover:text-foreground"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "num w-8 text-xs font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "num relative size-8 p-0 text-center text-sm",
        day_button: cn(
          "size-8 rounded-md font-normal outline-none transition-colors hover:bg-foreground/15 focus-visible:ring-3 focus-visible:ring-ring/50"
        ),
        // El tramo se marca con el fondo de la celda y las puntas con el del botón: así se
        // ve el rango entero de un vistazo, sin que el color tenga que significar nada. El
        // velo del texto y no el token de superficie, porque el popover ya está en `raised`
        // y un tramo del mismo tono sería invisible sobre él.
        selected: "bg-foreground/10",
        range_start:
          "rounded-l-md bg-foreground/10 [&>button]:rounded-md [&>button]:bg-primary [&>button]:text-primary-foreground",
        range_end:
          "rounded-r-md bg-foreground/10 [&>button]:rounded-md [&>button]:bg-primary [&>button]:text-primary-foreground",
        range_middle: "bg-foreground/10 text-foreground",
        today: "underline decoration-dotted underline-offset-4",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
