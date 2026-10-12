"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { valuesOf, type FormState } from "@/lib/form-state";

const resourceSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  categoryId: z.string().min(1, "Choose a category"),
  location: z.string().max(120, "Location is too long").nullable(),
  description: z.string().max(500, "Description is too long").nullable(),
  capacity: z
    .number("Capacity must be a number")
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(10000, "Capacity is too large")
    .nullable(),
});

function readForm(formData: FormData) {
  const optional = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v === "" ? null : v;
  };
  const capacity = optional("capacity");
  return {
    name: String(formData.get("name") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    location: optional("location"),
    description: optional("description"),
    capacity: capacity === null ? null : Number(capacity),
  };
}

function invalid(error: z.ZodError, formData: FormData): FormState {
  return {
    error: "Please fix the highlighted fields",
    fieldErrors: z.flattenError(error).fieldErrors,
    values: valuesOf(formData),
  };
}

export async function createResourceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = resourceSchema.safeParse(readForm(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  await db.resource.create({ data: parsed.data });
  revalidatePath("/");
  revalidatePath("/admin/resources");
  redirect("/admin/resources");
}

export async function updateResourceAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = resourceSchema.safeParse(readForm(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  await db.resource.update({ where: { id }, data: parsed.data });
  revalidatePath("/");
  revalidatePath(`/resources/${id}`);
  revalidatePath("/admin/resources");
  redirect("/admin/resources");
}

export async function toggleResourceActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource) return;

  await db.resource.update({ where: { id }, data: { isActive: !resource.isActive } });
  revalidatePath("/");
  revalidatePath(`/resources/${id}`);
  revalidatePath("/admin/resources");
}
