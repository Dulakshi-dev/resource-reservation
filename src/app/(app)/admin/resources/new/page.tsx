import { createResourceAction } from "@/actions/resources";
import { ResourceForm } from "@/components/resource-form";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function NewResourcePage() {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Add resource</h1>
      <div className="mt-6">
        <ResourceForm action={createResourceAction} categories={categories} submitLabel="Add resource" />
      </div>
    </div>
  );
}
