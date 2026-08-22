import { PageHeader } from "@/components/page-header";
import { requireCompanyContext } from "@/server/dal/context";
import { getCompanyById } from "@/server/dal/companies";

export default async function DashboardPage() {
  const ctx = await requireCompanyContext();
  const company = await getCompanyById(ctx.companyId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={`Bem-vindo ao ERP Facila${company ? ` — ${company.name}` : ""}.`}
      />
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">
          Papel: <span className="font-medium text-foreground">{ctx.role}</span>
        </p>
        {ctx.isActingAs && (
          <p className="mt-2 text-sm text-amber-700">
            Você está no modo suporte (super admin agindo como empresa).
          </p>
        )}
      </div>
    </div>
  );
}
