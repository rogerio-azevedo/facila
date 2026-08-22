import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <p className="text-muted-foreground">Editar dados fiscais e endereço.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/clients">Voltar</Link>
        </Button>
      </div>
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
