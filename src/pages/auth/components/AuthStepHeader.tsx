type AuthStepHeaderProps = {
  title: string
  description?: string
}

export function AuthStepHeader({ title, description }: AuthStepHeaderProps) {
  return (
    <header className="space-y-2">
      <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="text-sm sm:text-base text-slate-500 leading-relaxed">{description}</p>
      ) : null}
    </header>
  )
}
