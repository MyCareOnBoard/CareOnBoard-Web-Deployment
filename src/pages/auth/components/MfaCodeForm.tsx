import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonLoader } from '@/components/ui/loader'
import { MFA_COPY } from '@/utils/auth/copy/mfaCopy'
import OtpBoxInput from '@/pages/auth/family-login/OtpBoxInput'
import {
  authLabelClass,
  authLinkClass,
  authPrimaryButtonClass,
} from '@/pages/auth/components/authFormStyles'

export const RESEND_COOLDOWN_SEC = 60

type MfaCodeFormProps = {
  onVerify: (code: string) => Promise<void>
  onResend: () => Promise<void>
  verifyLabel: string
  verifying: boolean
  sending: boolean
  error?: string
  codeSent: boolean
  autoFocus?: boolean
  codeLabel?: string
  resendCopy?: {
    resend: string
    resendCountdown: (seconds: number) => string
  }
}

export default function MfaCodeForm({
  onVerify,
  onResend,
  verifyLabel,
  verifying,
  sending,
  error,
  codeSent,
  autoFocus = true,
  codeLabel = MFA_COPY.form.codeLabel,
  resendCopy = {
    resend: MFA_COPY.enroll.resend,
    resendCountdown: MFA_COPY.enroll.resendCountdown,
  },
}: MfaCodeFormProps) {
  const [code, setCode] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)
  const submittedRef = useRef('')

  useEffect(() => {
    if (!codeSent) return
    setResendSeconds(RESEND_COOLDOWN_SEC)
    const timer = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [codeSent])

  // Auto-submit once the 6 digits are in. Guard skips re-firing the same code after a failure.
  useEffect(() => {
    if (code.length === 6 && code !== submittedRef.current && !verifying) {
      submittedRef.current = code
      void onVerify(code)
    }
  }, [code, verifying, onVerify])

  const handleResend = async () => {
    if (resendSeconds > 0 || sending) return
    await onResend()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length < 6) return
    submittedRef.current = trimmed
    await onVerify(trimmed)
  }

  if (!codeSent) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div role="group" aria-labelledby="mfa-code-label" aria-describedby={error ? 'mfa-code-error' : undefined} className="space-y-3">
        <p id="mfa-code-label" className={authLabelClass}>{codeLabel}</p>
        <OtpBoxInput
          value={code}
          onChange={setCode}
          disabled={verifying}
          autoFocus={autoFocus}
          className="flex justify-between gap-2"
          boxClassName="h-14 w-full max-w-[64px] min-w-0 rounded-[12px] border border-[#e3e8ea] bg-white text-center text-[22px] font-medium text-[#10141a] outline-none transition-colors focus:border-[#007679] focus:ring-2 focus:ring-[#007679]/20 disabled:opacity-50 dark:border-white/10 dark:bg-[#1b232b] dark:text-[#f4f6f7]"
        />
      </div>

      {error && (
        <p id="mfa-code-error" className="text-[13px] text-[#d0202b]" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={verifying || code.trim().length < 6}
        className={authPrimaryButtonClass}
      >
        {verifying ? (
          <span className="flex items-center justify-center gap-2">
            <ButtonLoader />
            {MFA_COPY.loading.verifying}
          </span>
        ) : (
          verifyLabel
        )}
      </Button>

      <p className="text-center text-[14px] text-[#34434c] dark:text-[#c9d3d6]">
        Didn't receive a code?{' '}
        <button
          type="button"
          disabled={resendSeconds > 0 || sending}
          onClick={handleResend}
          className={`${authLinkClass} rounded-[4px] disabled:cursor-not-allowed disabled:text-[#8a969c] disabled:no-underline focus-visible:outline-2 focus-visible:outline-[#007679]`}
          aria-label={resendSeconds > 0 ? `${resendCopy.resend} in ${resendSeconds} seconds` : undefined}
        >
          {sending
            ? MFA_COPY.loading.resending
            : resendSeconds > 0
              ? resendCopy.resendCountdown(resendSeconds)
              : resendCopy.resend}
        </button>
      </p>
    </form>
  )
}
