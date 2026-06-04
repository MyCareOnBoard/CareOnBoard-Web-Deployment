/**
 * Off-screen anchor for Firebase invisible reCAPTCHA.
 * Must keep non-zero size so the verifier can render (zero-size breaks INVALID_APP_CREDENTIAL).
 * The floating badge is hidden via .auth-layout-active in index.css; see MFA copy for disclosure.
 */
export function RecaptchaAnchor({ id }: { id: string }) {
  return (
    <div
      id={id}
      className="absolute -left-[9999px] top-0 h-px w-[300px] overflow-hidden"
      aria-hidden="true"
    />
  )
}
