import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getPrimaryAddressForClient } from "@/server/dal/addresses";
import { getClientById } from "@/server/dal/clients";

type EditClientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const [client, address] = await Promise.all([
    getClientById(id),
    getPrimaryAddressForClient(id),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={client.name}
        description="Editar dados fiscais e endereço."
        actions={
          <Button variant="outline" asChild>
            <Link href="/clients">Voltar</Link>
          </Button>
        }
      />
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
