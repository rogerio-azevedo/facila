import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientAccountsReceivableSection } from "@/components/accounts-receivable/client-accounts-receivable-section";
import { ClientContractsSection } from "@/components/contracts/client-contracts-section";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getPrimaryAddressForClient } from "@/server/dal/addresses";
import { listAccountsReceivableByClientId } from "@/server/dal/accounts-receivable";
import { getClientById } from "@/server/dal/clients";
import { listContractsByClientId, listContractSummariesByIds } from "@/server/dal/contracts";

type EditClientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const [client, address, contracts, receivables] = await Promise.all([
    getClientById(id),
    getPrimaryAddressForClient(id),
    listContractsByClientId(id),
    listAccountsReceivableByClientId(id),
  ]);

  if (!client) {
    notFound();
  }

  const contractSummaries = await listContractSummariesByIds([
    ...new Set(receivables.map((item) => item.contractId).filter(Boolean) as string[]),
  ]);
  const contractNameById = new Map(
    contractSummaries.map((contract) => [contract.id, contract.name] as const),
  );
  const receivableRows = receivables.map((item) => ({
    id: item.id,
    clientId: item.clientId,
    contractId: item.contractId,
    contractName: item.contractId ? contractNameById.get(item.contractId) : null,
    amount: item.amount,
    competenceDate: item.competenceDate,
    dueDate: item.dueDate,
    status: item.status,
    paymentDate: item.paymentDate,
    paymentMethod: item.paymentMethod,
    nfseStatus: item.nfseStatus,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={client.name}
        description="Editar dados fiscais, endereço, contratos e contas a receber."
        actions={
          <Button variant="outline" asChild>
            <Link href="/clients">Voltar</Link>
          </Button>
        }
      />
      <ClientContractsSection clientId={client.id} contracts={contracts} />
      <ClientAccountsReceivableSection clientId={client.id} receivables={receivableRows} />
      <ClientForm
        mode="edit"
        clientId={client.id}
        initialClient={{
          name: client.name,
          personType: client.personType,
          document: client.document,
          legalName: client.legalName ?? "",
          tradeName: client.tradeName ?? "",
          stateRegistration: client.stateRegistration ?? "",
          icmsTaxpayerIndicator: client.icmsTaxpayerIndicator,
          municipalRegistration: client.municipalRegistration ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
        }}
        initialAddress={
          address
            ? {
                street: address.street,
                number: address.number,
                complement: address.complement ?? "",
                neighborhood: address.neighborhood,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                codMunicipioIbge: address.codMunicipioIbge ?? "",
                latitude: address.latitude ?? undefined,
                longitude: address.longitude ?? undefined,
              }
            : undefined
        }
      />
    </div>
  );
}
