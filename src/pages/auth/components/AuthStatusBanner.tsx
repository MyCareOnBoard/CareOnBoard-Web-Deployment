import { ButtonLoader } from '@/components/ui/loader'

type AuthStatusBannerProps = {
  message: string
  /** Shown to screen readers while the visual message is visible */
  live?: 'polite' | 'assertive'
}

export function AuthStatusBanner({ message, live = 'polite' }: AuthStatusBannerProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-[#e5eef5] bg-slate-50/80 px-4 py-3"
      role="status"
      aria-live={live}
    >
      <ButtonLoader aria-hidden />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  )
}
