import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Floating "back to top" control for the dashboard layouts. These pages scroll at the
 * window level (the header/sidebar are fixed, <main> isn't its own scroll container), so
 * this tracks window.scrollY directly rather than a specific element.
 *
 * It's fixed-position and sits directly on the page canvas, never nested inside a page's
 * own card, so — unlike the inline form controls elsewhere in this app — it's safe to keep
 * dark-aware: there's no still-light container it could clash with.
 */
export function ScrollToTopButton({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#00b4b8] bg-white cursor-pointer text-[#596065] shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-105 hover:text-[#00b4b8] hover:shadow-[0_16px_40px_rgba(0,0,0,0.16)] md:bottom-8 md:right-8",
        " dark:bg-[#1b232b] dark:text-[#9aa4a8] dark:hover:text-[#00b4b8] dark:hover:border-2 border-[#00b4b8]",
        className
      )}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
