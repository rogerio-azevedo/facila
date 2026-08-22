import Link from "next/link";

import { BatchBillingPanel } from "@/components/billing/batch-billing-panel";
import { BillingRunsHistory } from "@/components/billing/billing-runs-history";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatCompetenceMonth } from "@/lib/billing";
import { getBatchBillingPreview } from "@/modules/billing/preview";
import { listBillingRuns } from "@/server/dal/billing-runs";

type BillingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams;
  const competenceMonth =
    typeof params.competenceMonth === "string" && /^\d{4}-\d{2}$/.test(params.competenceMonth)
      ? params.competenceMonth
      : formatCompetenceMonth(new Date());

  const [preview, runs] = await Promise.all([
    getBatchBillingPreview(competenceMonth),
    listBillingRuns(10),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Faturamento em lote"
        description="Gere contas a receber mensais a partir dos contratos ativos."
        actions={
          <Button variant="outline" asChild>
            <Link href="/accounts-receivable">Contas a receber</Link>
          </Button>
        }
      />

      <BatchBillingPanel
        initialCompetenceMonth={competenceMonth}
        initialPreview={{
          items: preview.items,
          readyCount: preview.readyCount,
          readyTotalAmount: preview.readyTotalAmount,
        }}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Histórico recente</h2>
        <BillingRunsHistory runs={runs} />
      </section>
    </div>
  );
}
