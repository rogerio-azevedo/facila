import Link from "next/link";
import { notFound } from "next/navigation";

import { ContractForm } from "@/components/contracts/contract-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { buildContractFormInitial } from "@/lib/contract-form-initial";
import { listClientOptions } from "@/server/dal/clients";
import { getContractById } from "@/server/dal/contracts";

type EditContractPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditContractPage({
  params,
  searchParams,
}: EditContractPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const uploadError =
    typeof query.uploadError === "string" ? query.uploadError : undefined;
  const [contract, clients] = await Promise.all([getContractById(id), listClientOptions()]);

  if (!contract) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={contract.name}
        description="Editar dados contratuais, descrição para NFS-e e anexar o PDF."
        actions={
          <Button variant="outline" asChild>
            <Link href="/contracts">Voltar</Link>
          </Button>
        }
      />

      <ContractForm
        mode="edit"
        contractId={contract.id}
        clients={clients}
        initial={buildContractFormInitial(contract)}
        fileMeta={{
          fileName: contract.fileName,
          fileUploadedAt: contract.fileUploadedAt,
        }}
        initialUploadError={uploadError}
      />
    </div>
  );
}
