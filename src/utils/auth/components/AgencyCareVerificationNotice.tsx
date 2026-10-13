import { MailCheck } from 'lucide-react'

export function AgencyCareVerificationNotice({ email, sent }: { email?: string | null; sent: boolean }) {
  return <section className="ac-verification-notice" role={sent ? 'status' : undefined}>
    <div className="ac-verification-notice-heading">
      <MailCheck aria-hidden="true" />
      <h2>{sent ? 'Check your email' : 'Verify your email'}</h2>
    </div>
    {email && <strong className="ac-verification-email">{email}</strong>}
    <p>{sent
      ? 'Open the verification link in your email, then return here and choose Check email verification.'
      : 'Send a verification email below, then open the link in your inbox.'}</p>
    {sent && <p className="ac-verification-hint">If it hasn’t arrived, check your spam or junk folder.</p>}
  </section>
}
