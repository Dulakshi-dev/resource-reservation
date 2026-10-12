export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values, so the form can refill itself after a failed submit. */
  values?: Record<string, string>;
} | null;

export function valuesOf(formData: FormData, omit: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !omit.includes(key) && !key.startsWith("$")) {
      out[key] = value;
    }
  }
  return out;
}
