/**
 * The full check for a password being set (signup, settings, reset link):
 * the synchronous rules, the confirmation match, then the breach check.
 * Shared so every form applies exactly the same rules.
 */
import { checkPasswordBreach, type BreachCheckOptions } from "./breach-check";
import { checkPasswordRules, PASSWORD_PROBLEM_MESSAGE } from "./password-rules";

export type NewPasswordResult = { ok: true } | { ok: false; field: "password" | "confirm"; message: string };

export async function validateNewPassword(
  password: string,
  confirm: string,
  options?: BreachCheckOptions,
): Promise<NewPasswordResult> {
  const [problem] = checkPasswordRules(password);
  if (problem) return { ok: false, field: "password", message: PASSWORD_PROBLEM_MESSAGE[problem] };
  if (password !== confirm) return { ok: false, field: "confirm", message: "Passwords don't match." };

  const breach = await checkPasswordBreach(password, options);
  if (breach.status === "breached") {
    return { ok: false, field: "password", message: PASSWORD_PROBLEM_MESSAGE.breached };
  }
  // "not-found" and "unavailable" both pass: the breach check never blocks on failure.
  return { ok: true };
}
