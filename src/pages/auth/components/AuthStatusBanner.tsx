import { ButtonLoader } from '@/components/ui/loader'

type AuthStatusBannerProps = {
  message: string
  /** Shown to screen readers while the visual message is visible */
  live?: 'polite' | 'assertive'
}

export function AuthStatusBanner({ message, live = 'polite' }: AuthStatusBannerProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-[12px] border border-[#e3e8ea] bg-[#f6f8f9] px-4 py-3 dark:border-white/10 dark:bg-[#1b232b]"
      role="status"
      aria-live={live}
    >
      <ButtonLoader aria-hidden />
      <p className="text-sm text-[#34434c] dark:text-[#c9d3d6]">{message}</p>
    </div>
  )
}
