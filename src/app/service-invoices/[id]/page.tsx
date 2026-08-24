import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ServiceInvoiceDetailSection } from "@/components/service-invoices/service-invoice-detail-section";
import { Button } from "@/components/ui/button";
import { formatCompetenceMonth } from "@/lib/billing";
import { formatCurrency } from "@/lib/format-currency";
import { formatServiceInvoiceNumber } from "@/lib/parse-nfse-access-key";
import { serviceInvoiceStatusLabels } from "@/schemas/service-invoices";
import { getAccountReceivableById } from "@/server/dal/accounts-receivable";
import { getClientById } from "@/server/dal/clients";
import { getIssuerById } from "@/server/dal/issuers";
import { getServiceInvoiceById } from "@/server/dal/service-invoices";

type ServiceInvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ServiceInvoiceDetailPage({
  params,
}: ServiceInvoiceDetailPageProps) {
  const { id } = await params;
  const invoice = await getServiceInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const [accountReceivable, issuer] = await Promise.all([
    getAccountReceivableById(invoice.accountReceivableId),
    getIssuerById(invoice.issuerId),
  ]);

  if (!accountReceivable) {
    notFound();
  }

  const client = await getClientById(accountReceivable.clientId);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`NFS-e ${formatServiceInvoiceNumber(invoice)}`}
        description={`${serviceInvoiceStatusLabels[invoice.status]} · ${formatCompetenceMonth(accountReceivable.competenceDate)} · ${formatCurrency(accountReceivable.amount)}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/service-invoices">Voltar</Link>
          </Button>
        }
      />

      <ServiceInvoiceDetailSection
        invoice={invoice}
        accountReceivable={{
          id: accountReceivable.id,
          description: accountReceivable.description,
          amount: accountReceivable.amount,
          competenceDate: accountReceivable.competenceDate,
        }}
        clientName={client?.name ?? "-"}
        issuerName={issuer?.legalName ?? "-"}
      />
    </div>
  );
}
