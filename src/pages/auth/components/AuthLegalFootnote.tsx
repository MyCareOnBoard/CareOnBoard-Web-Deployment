const PRIVACY_URL = 'https://policies.google.com/privacy'
const TERMS_URL = 'https://policies.google.com/terms'

export function AuthLegalFootnote() {
  return (
    <p className="text-xs text-center text-[#5d6b73] leading-relaxed dark:text-[#9aa4a8]">
      Protected by reCAPTCHA.{' '}
      <a
        href={PRIVACY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#00494a] hover:text-[#007679] underline-offset-2 hover:underline dark:text-[#5fd0cd]"
      >
        Privacy Policy
      </a>
      {' and '}
      <a
        href={TERMS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#00494a] hover:text-[#007679] underline-offset-2 hover:underline dark:text-[#5fd0cd]"
      >
        Terms of Service
      </a>
      .
    </p>
  )
}
