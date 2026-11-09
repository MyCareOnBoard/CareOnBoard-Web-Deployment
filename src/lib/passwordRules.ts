/** Password rules shown as chips wherever a new password is set. */
export const PASSWORD_RULES = [
  { label: "8+ Characters", test: (value: string) => value.length >= 8 },
  { label: "Number", test: (value: string) => /\d/.test(value) },
  { label: "Uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Lowercase letter", test: (value: string) => /[a-z]/.test(value) },
];

export const meetsPasswordRules = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value));
