export interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
}

/** Mirrors backend/app/services/auth/schemas.py's RegisterRequest password
 * validator exactly — keep these two in sync.
 */
export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
  { label: "One special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function passwordMeetsAllRules(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}
