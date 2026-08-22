import { PageHeader } from "@/components/page-header";
import { PlatformCompaniesPanel } from "@/components/platform/companies-panel";
import { listAllCompanies } from "@/server/dal/companies";
import { requirePlatformContext } from "@/server/dal/context";

export default async function PlatformCompaniesPage() {
  await requirePlatformContext();
  const companies = await listAllCompanies();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Empresas"
        description="Gerencie empresas cadastradas e entre no modo suporte quando necessário."
      />
      <PlatformCompaniesPanel companies={companies} />
    </div>
  );
}
