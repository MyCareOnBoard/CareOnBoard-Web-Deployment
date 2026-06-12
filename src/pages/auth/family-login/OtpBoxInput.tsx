import { useEffect, useRef } from "react"

type OtpBoxInputProps = {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  autoFocus?: boolean
  length?: number
}

export default function OtpBoxInput({
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  length = 6,
}: OtpBoxInputProps) {
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus()
  }, [autoFocus])

  const update = (index: number, char: string) => {
    const next = digits.map((d, i) => (i === index ? char : d))
    onChange(next.join(""))
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        update(index, "")
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus()
        update(index - 1, "")
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleInput = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "")
    if (!raw) return
    // Handle paste: distribute digits starting from this index
    const chars = raw.slice(0, length - index).split("")
    const next = [...digits]
    chars.forEach((c, i) => {
      if (index + i < length) next[index + i] = c
    })
    onChange(next.join(""))
    const focusIdx = Math.min(index + chars.length, length - 1)
    inputsRef.current[focusIdx]?.focus()
  }

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-12 h-14 text-center text-xl font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-[#00B4B8] focus:ring-2 focus:ring-[#00B4B8]/20 disabled:opacity-50 transition-colors"
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
