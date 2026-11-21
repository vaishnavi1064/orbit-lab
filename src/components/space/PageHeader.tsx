/** Page header: mono label above a Space Grotesk title, optional aside. */

import type { ReactNode } from 'react'

interface Props {
  label: string
  title: string
  children?: ReactNode
  aside?: ReactNode
}

export function PageHeader({ label, title, children, aside }: Props) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="label-mono text-primary">{label}</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-[2.5rem]">{title}</h1>
        {children && <div className="mt-3 max-w-[60ch] text-muted-foreground">{children}</div>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  )
}
