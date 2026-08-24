import Link from "next/link";
import { notFound } from "next/navigation";

import { toggleIssuerEnvironmentAction } from "@/actions/issuer-environment";
import { IssuerCertificateField } from "@/components/issuers/issuer-certificate-field";
import { IssuerForm } from "@/components/issuers/issuer-form";
import { IssuerServiceProfilesSection } from "@/components/issuers/issuer-service-profiles-section";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatCnpj } from "@/lib/format-document";
import { getPrimaryAddressForIssuer } from "@/server/dal/addresses";
import { listIssuerServiceProfiles } from "@/server/dal/issuer-service-profiles";
import { getIssuerById } from "@/server/dal/issuers";

type IssuerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function IssuerDetailPage({ params }: IssuerDetailPageProps) {
  const { id } = await params;
  const issuer = await getIssuerById(id);

  if (!issuer) {
    notFound();
  }

  const [address, profiles] = await Promise.all([
    getPrimaryAddressForIssuer(id),
    listIssuerServiceProfiles(id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={issuer.legalName}
        description={`${formatCnpj(issuer.cnpj)} · ${issuer.municipalityName}/${issuer.municipalityUf}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/issuers">Voltar</Link>
          </Button>
        }
      />

      <IssuerCertificateField
        issuerId={issuer.id}
        fileName={issuer.certificateFileName}
        uploadedAt={issuer.certificateUploadedAt}
        expiresAt={issuer.certificateExpiresAt}
        subjectCn={issuer.certificateSubjectCn}
      />

      <IssuerServiceProfilesSection
        issuerId={issuer.id}
        codMunicipioIbge={issuer.codMunicipioIbge}
        profiles={profiles}
        showSimplesFields={issuer.opSimpNac !== "1"}
        requirePTotTribSn={issuer.opSimpNac === "3"}
      />

      <IssuerForm mode="edit" issuerId={issuer.id} initialIssuer={{
          legalName: issuer.legalName,
          tradeName: issuer.tradeName ?? "",
          cnpj: issuer.cnpj,
          municipalRegistration: issuer.municipalRegistration ?? "",
          stateRegistration: issuer.stateRegistration ?? "",
          codMunicipioIbge: issuer.codMunicipioIbge,
          municipalityLabel: `${issuer.municipalityName}/${issuer.municipalityUf}`,
          email: issuer.email ?? "",
          phone: issuer.phone ?? "",
          opSimpNac: issuer.opSimpNac as "1" | "2" | "3",
          regApTribSn: (issuer.regApTribSn as "1" | "2" | "3" | "") ?? "",
          regEspTrib: issuer.regEspTrib as "0" | "1" | "2" | "3" | "4" | "5" | "6",
          incentivadorCultural: issuer.incentivadorCultural,
          dpsSeries: issuer.dpsSeries,
          nextDpsNumber: String(issuer.nextDpsNumber),
          environment: issuer.environment,
          status: issuer.status,
          isDefault: issuer.isDefault,
        }}
        initialAddress={{
          street: address?.street ?? "",
          number: address?.number ?? "",
          complement: address?.complement ?? "",
          neighborhood: address?.neighborhood ?? "",
          city: address?.city ?? "",
          state: address?.state ?? "",
          postalCode: address?.postalCode ?? "",
          codMunicipioIbge: address?.codMunicipioIbge ?? "",
          latitude: address?.latitude ?? undefined,
          longitude: address?.longitude ?? undefined,
        }}
      />

      <form action={toggleIssuerEnvironmentAction.bind(null, issuer.id)}>
        <Button type="submit" variant="outline">
          Alternar para {issuer.environment === "homologacao" ? "produção" : "homologação"}
        </Button>
      </form>
    </div>
  );
}
