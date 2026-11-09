import Link from "next/link";
import { getInvitationByToken } from "@/server/dal/company-invitations";
import { getCompanyById } from "@/server/dal/companies";
import { findUserByEmail } from "@/server/dal/users";
import { InviteAcceptanceForm } from "@/components/auth/invite-acceptance-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-destructive">Convite inválido</CardTitle>
          <CardDescription>
            Este link de convite não existe ou foi digitado incorretamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Ir para o Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (invitation.acceptedAt) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Convite já utilizado</CardTitle>
          <CardDescription>
            Este convite já foi aceito anteriormente. Você já pode fazer login no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Fazer Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (invitation.revokedAt) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-destructive">Convite cancelado</CardTitle>
          <CardDescription>
            Este convite foi cancelado pelo administrador da empresa. Solicite um novo link se necessário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Ir para o Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (new Date() > invitation.expiresAt) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-destructive">Convite expirado</CardTitle>
          <CardDescription>
            Este link de convite expirou (validade de 7 dias). Solicite um novo envio ao administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Ir para o Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const company = await getCompanyById(invitation.companyId);
  const existingUser = await findUserByEmail(invitation.email);

  return (
    <InviteAcceptanceForm
      token={invitation.token}
      email={invitation.email}
      companyName={company?.name ?? "Facila ERP"}
      role={invitation.role}
      isExistingUser={Boolean(existingUser)}
    />
  );
}

