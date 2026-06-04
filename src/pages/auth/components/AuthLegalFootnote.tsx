const PRIVACY_URL = 'https://policies.google.com/privacy'
const TERMS_URL = 'https://policies.google.com/terms'

export function AuthLegalFootnote() {
  return (
    <p className="text-xs text-center text-slate-500 leading-relaxed">
      Protected by reCAPTCHA.{' '}
      <a
        href={PRIVACY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#00B4B8] hover:text-[#148a9c] underline-offset-2 hover:underline"
      >
        Privacy Policy
      </a>
      {' and '}
      <a
        href={TERMS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#00B4B8] hover:text-[#148a9c] underline-offset-2 hover:underline"
      >
        Terms of Service
      </a>
      .
    </p>
  )
}
