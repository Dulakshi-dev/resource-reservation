"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/form-state";
import { FieldError } from "./field-error";

type Defaults = { name: string; categoryId: string; location: string; capacity: string; description: string };

export function ResourceForm({
  action,
  categories,
  defaults,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: { id: string; name: string }[];
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const v: Record<string, string | undefined> = state?.values ?? defaults ?? {};
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="name" className="label">Name</label>
        <input id="name" name="name" required maxLength={80} className="field" defaultValue={v.name ?? ""} />
        <FieldError messages={fe.name} />
      </div>

      <div>
        <label htmlFor="categoryId" className="label">Category</label>
        <select id="categoryId" name="categoryId" required className="field" defaultValue={v.categoryId ?? ""}>
          <option value="" disabled>Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <FieldError messages={fe.categoryId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="location" className="label">Location (optional)</label>
          <input id="location" name="location" maxLength={120} className="field" defaultValue={v.location ?? ""} />
          <FieldError messages={fe.location} />
        </div>
        <div>
          <label htmlFor="capacity" className="label">Capacity (optional)</label>
          <input id="capacity" name="capacity" type="number" min={1} step={1} className="field" defaultValue={v.capacity ?? ""} />
          <FieldError messages={fe.capacity} />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="label">Description (optional)</label>
        <textarea id="description" name="description" rows={3} maxLength={500} className="field" defaultValue={v.description ?? ""} />
        <FieldError messages={fe.description} />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving" : submitLabel}
        </button>
        <Link href="/admin/resources" className="btn btn-quiet">Back to resources</Link>
      </div>
    </form>
  );
}
