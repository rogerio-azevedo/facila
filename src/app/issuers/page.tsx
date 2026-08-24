import Link from "next/link";

import { IssuersTable } from "@/components/issuers/issuers-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-currency";
import { parseIssuerListQuery } from "@/schemas/issuers";
import { listIssuers, listIssuersExpiringCertificates } from "@/server/dal/issuers";

type IssuersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IssuersPage({ searchParams }: IssuersPageProps) {
  const params = await searchParams;
  const query = parseIssuerListQuery(params);
  const [{ items }, expiringCertificates] = await Promise.all([
    listIssuers(query),
    listIssuersExpiringCertificates(30),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Emissores"
        description="Gerencie emissores, certificados digitais e perfis fiscais de NFS-e."
        actions={
          <Button asChild>
            <Link href="/issuers/new">Novo emissor</Link>
          </Button>
        }
      />
      {expiringCertificates.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Certificados expirando em até 30 dias</p>
          <ul className="mt-2 space-y-1">
            {expiringCertificates.map((issuer) => (
              <li key={issuer.id}>
                {issuer.legalName}
                {issuer.certificateExpiresAt
                  ? ` — validade ${formatDate(issuer.certificateExpiresAt)}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <IssuersTable rows={items} />
    </div>
  );
}
