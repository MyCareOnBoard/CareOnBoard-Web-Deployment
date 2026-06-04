import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import MfaCodeForm, { RESEND_COOLDOWN_SEC } from './MfaCodeForm'

vi.mock('@/components/ui/loader', () => ({
  ButtonLoader: () => <span data-testid="loader" />,
}))

describe('MfaCodeForm resend cooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts cooldown when codeSent becomes true', () => {
    const onVerify = vi.fn()
    const onResend = vi.fn()

    render(
      <MfaCodeForm
        codeSent
        onVerify={onVerify}
        onResend={onResend}
        verifyLabel="Verify"
        verifying={false}
        sending={false}
      />
    )

    expect(screen.getByRole('button', { name: /Send another code in 60 seconds/i })).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(RESEND_COOLDOWN_SEC * 1000)
    })

    expect(screen.getByRole('button', { name: /Send another verification code/i })).not.toBeDisabled()
  })

  it('renders nothing when code not sent yet', () => {
    const { container } = render(
      <MfaCodeForm
        codeSent={false}
        onVerify={vi.fn()}
        onResend={vi.fn()}
        verifyLabel="Verify"
        verifying={false}
        sending={false}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
