import { notFound } from "next/navigation";
import { updateResourceAction } from "@/actions/resources";
import { ResourceForm } from "@/components/resource-form";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [resource, categories] = await Promise.all([
    db.resource.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!resource) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Edit {resource.name}</h1>
      <div className="mt-6">
        <ResourceForm
          action={updateResourceAction.bind(null, id)}
          categories={categories}
          submitLabel="Save changes"
          defaults={{
            name: resource.name,
            categoryId: resource.categoryId,
            location: resource.location ?? "",
            capacity: resource.capacity?.toString() ?? "",
            description: resource.description ?? "",
          }}
        />
      </div>
    </div>
  );
}
