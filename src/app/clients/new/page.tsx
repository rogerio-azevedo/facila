import Link from "next/link";

import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function NewClientPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Novo cliente"
        description="Dados fiscais e endereço de cobrança."
        actions={
          <Button variant="outline" asChild>
            <Link href="/clients">Voltar</Link>
          </Button>
        }
      />
      <ClientForm mode="create" />
    </div>
  );
}
