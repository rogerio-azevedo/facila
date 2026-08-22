import Link from "next/link";

import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";

export default function NewClientPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Novo cliente</h1>
          <p className="text-muted-foreground">Dados fiscais e endereço de cobrança.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/clients">Voltar</Link>
        </Button>
      </div>
      <ClientForm mode="create" />
    </div>
  );
}
