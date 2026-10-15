import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/providers/ThemeProvider"
import { cn } from "@/lib/utils"

/**
 * Light/dark switch styled to match the existing header pill buttons
 * (see HeaderActionButton in DashboardHeader.tsx) so it drops into either
 * header without looking like a one-off control.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[50px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] text-[#808081] backdrop-blur-[22px] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.5)]",
        "dark:border-white/10 dark:bg-white/5 dark:text-[#9aa4a8] dark:hover:bg-white/10 dark:hover:border-white/20",
        className
      )}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
