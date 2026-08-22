import { PlatformCompaniesPanel } from "@/components/platform/companies-panel";
import { listAllCompanies } from "@/server/dal/companies";
import { requirePlatformContext } from "@/server/dal/context";

export default async function PlatformCompaniesPage() {
  await requirePlatformContext();
  const companies = await listAllCompanies();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Empresas</h1>
        <p className="text-muted-foreground">
          Gerencie empresas cadastradas e entre no modo suporte quando necessário.
        </p>
      </div>
      <PlatformCompaniesPanel companies={companies} />
    </div>
  );
}
