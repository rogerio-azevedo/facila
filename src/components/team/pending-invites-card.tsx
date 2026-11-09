"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, MailIcon, Trash2Icon } from "lucide-react";

import { revokeCompanyInvitationAction } from "@/actions/company-invitations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompanyInvitationRecord } from "@/server/dal/company-invitations";

type PendingInvitesCardProps = {
  invitations: CompanyInvitationRecord[];
  canManage: boolean;
};

export function PendingInvitesCard({ invitations, canManage }: PendingInvitesCardProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const pendingList = invitations.filter(
    (inv) => !inv.acceptedAt && !inv.revokedAt && new Date() <= new Date(inv.expiresAt),
  );

  if (pendingList.length === 0) {
    return null;
  }

  async function handleCopy(token: string) {
    const fullUrl = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    } catch {
      // Fallback
    }
  }

  async function handleRevoke(invitationId: string) {
    if (!confirm("Deseja realmente cancelar este convite?")) {
      return;
    }
    setRevokingId(invitationId);
    try {
      await revokeCompanyInvitationAction({ invitationId });
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MailIcon className="h-4 w-4 text-muted-foreground" />
          Convites pendentes ({pendingList.length})
        </CardTitle>
        <CardDescription>
          Pessoas que receberam link de acesso e ainda não concluíram o cadastro ou aceite.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingList.map((inv) => {
              const isCopied = copiedToken === inv.token;
              const isRevoking = revokingId === inv.id;

              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {inv.role === "admin" ? "Admin" : "Membro"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(inv.expiresAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => handleCopy(inv.token)}
                      >
                        {isCopied ? (
                          <>
                            <CheckIcon className="h-3.5 w-3.5 text-primary" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <CopyIcon className="h-3.5 w-3.5" />
                            Copiar link
                          </>
                        )}
                      </Button>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRevoke(inv.id)}
                          disabled={isRevoking}
                          title="Cancelar convite"
                        >
                          <Trash2Icon className="h-4 w-4" />
                          <span className="sr-only">Cancelar convite</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

