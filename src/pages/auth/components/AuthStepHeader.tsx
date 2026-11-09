type AuthStepHeaderProps = {
  title: string
  description?: string
}

export function AuthStepHeader({ title, description }: AuthStepHeaderProps) {
  return (
    <header className="space-y-2">
      <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.01em] text-[#00494a] sm:text-[32px] dark:text-[#5fd0cd]">
        {title}
      </h2>
      {description ? (
        <p className="text-[15px] leading-relaxed text-[#34434c] sm:text-[16px] dark:text-[#9aa4a8]">{description}</p>
      ) : null}
    </header>
  )
}
