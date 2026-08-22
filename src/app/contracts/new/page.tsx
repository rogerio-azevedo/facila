import Link from "next/link";

import { ContractForm } from "@/components/contracts/contract-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { listClientOptions } from "@/server/dal/clients";

type NewContractPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewContractPage({ searchParams }: NewContractPageProps) {
  const params = await searchParams;
  const clientId = typeof params.clientId === "string" ? params.clientId : undefined;
  const clients = await listClientOptions();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Novo contrato"
        description="Cadastre um serviço mensal vinculado a um cliente. A descrição informada será usada na emissão da nota fiscal."
        actions={
          <Button variant="outline" asChild>
            <Link href="/contracts">Voltar</Link>
          </Button>
        }
      />

      <ContractForm
        mode="create"
        clients={clients}
        initial={{
          clientId: clientId ?? "",
        }}
      />
    </div>
  );
}
