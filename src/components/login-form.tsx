"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import type { FormState } from "@/lib/form-state";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(loginAction, null);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field" defaultValue={state?.values?.email ?? ""} />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
