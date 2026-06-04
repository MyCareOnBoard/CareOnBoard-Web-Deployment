import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ButtonLoader } from '@/components/ui/loader'
import { MFA_COPY } from '@/utils/auth/copy/mfaCopy'
import {
  authGhostLinkClass,
  authInputClass,
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
  resendCopy = {
    resend: MFA_COPY.enroll.resend,
    resendCountdown: MFA_COPY.enroll.resendCountdown,
  },
}: MfaCodeFormProps) {
  const [code, setCode] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    if (!codeSent) return
    setResendSeconds(RESEND_COOLDOWN_SEC)
    const timer = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [codeSent])

  const handleResend = async () => {
    if (resendSeconds > 0 || sending) return
    await onResend()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length < 6) return
    await onVerify(trimmed)
  }

  if (!codeSent) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="mfa-code" className="text-sm font-medium text-slate-700">
          {MFA_COPY.form.codeLabel}
        </Label>
        <Input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder={MFA_COPY.form.codePlaceholder}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus={autoFocus}
          required
          className={`${authInputClass} tracking-[0.3em] text-center placeholder:tracking-normal placeholder:text-slate-400`}
          aria-describedby={error ? 'mfa-code-error' : 'mfa-code-hint'}
        />
        <p id="mfa-code-hint" className="text-xs text-slate-500">
          Codes expire after a few minutes.
        </p>
      </div>

      {error && (
        <p id="mfa-code-error" className="text-sm text-red-600" role="alert" aria-live="polite">
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

      <Button
        type="button"
        variant="ghost"
        disabled={resendSeconds > 0 || sending}
        onClick={handleResend}
        className={authGhostLinkClass}
        aria-label={
          resendSeconds > 0
            ? `Send another code in ${resendSeconds} seconds`
            : 'Send another verification code'
        }
      >
        {sending
          ? MFA_COPY.loading.resending
          : resendSeconds > 0
            ? resendCopy.resendCountdown(resendSeconds)
            : resendCopy.resend}
      </Button>
    </form>
  )
}
