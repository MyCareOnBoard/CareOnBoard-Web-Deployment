import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ButtonLoader } from '@/components/ui/loader'
import { MFA_COPY } from '@/utils/auth/copy/mfaCopy'

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
          Verification code
        </Label>
        <Input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus={autoFocus}
          required
          className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-base tracking-[0.3em] text-center placeholder:tracking-normal placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#00B4B8]/40 focus-visible:border-[#00B4B8]"
          aria-describedby={error ? 'mfa-code-error' : undefined}
        />
      </div>

      {error && (
        <p id="mfa-code-error" className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={verifying || code.trim().length < 6}
        className="w-full h-12 bg-[#00B4B8] hover:bg-[#148a9c] text-white rounded-2xl text-base font-semibold"
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
        className="w-full text-[#00B4B8] hover:text-[#148a9c]"
        aria-label={
          resendSeconds > 0
            ? `Send a new code in ${resendSeconds} seconds`
            : 'Send a new verification code'
        }
      >
        {sending
          ? MFA_COPY.loading.sending
          : resendSeconds > 0
            ? MFA_COPY.enroll.resendCountdown(resendSeconds)
            : MFA_COPY.enroll.resend}
      </Button>
    </form>
  )
}
