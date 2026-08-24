import Link from "next/link";

import { IssuerForm } from "@/components/issuers/issuer-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function NewIssuerPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Novo emissor"
        description="Cadastre a pessoa jurídica emitente de NFS-e."
        actions={
          <Button variant="outline" asChild>
            <Link href="/issuers">Voltar</Link>
          </Button>
        }
      />
      <IssuerForm mode="create" />
    </div>
  );
}
