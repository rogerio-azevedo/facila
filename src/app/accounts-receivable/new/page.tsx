import Link from "next/link";

import { AccountReceivableForm } from "@/components/accounts-receivable/account-receivable-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { listClientOptions } from "@/server/dal/clients";
import { listContractOptions } from "@/server/dal/contracts";

type NewAccountReceivablePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewAccountReceivablePage({
  searchParams,
}: NewAccountReceivablePageProps) {
  const params = await searchParams;
  const clientId = typeof params.clientId === "string" ? params.clientId : undefined;
  const [clients, contracts] = await Promise.all([
    listClientOptions(),
    listContractOptions(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nova conta a receber"
        description="Cadastre um título avulso ou vinculado a um contrato."
        actions={
          <Button variant="outline" asChild>
            <Link href="/accounts-receivable">Voltar</Link>
          </Button>
        }
      />

      <AccountReceivableForm
        mode="create"
        clients={clients}
        contracts={contracts}
        initial={{
          clientId: clientId ?? "",
        }}
      />
    </div>
  );
}
