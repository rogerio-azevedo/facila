"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, ShieldCheckIcon, UserIcon, UsersIcon } from "lucide-react";

import { getCompanyMembersAndInvitationsAction } from "@/actions/company-members";
import { InviteModal } from "@/components/team/invite-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompanyInvitationRecord } from "@/server/dal/company-invitations";
import type { CompanyMemberWithUser } from "@/server/dal/company-members";

type CompanyMembersDialogProps = {
  companyId: string;
  companyName: string;
};

export function CompanyMembersDialog({ companyId, companyName }: CompanyMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<CompanyMemberWithUser[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitationRecord[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getCompanyMembersAndInvitationsAction(companyId);
      setMembers(data.members);
      setInvitations(data.invitations);
    } catch {
      // Ignorar
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, companyId]);

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

  const pendingInvites = invitations.filter(
    (inv) => !inv.acceptedAt && !inv.revokedAt && new Date() <= new Date(inv.expiresAt),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UsersIcon className="h-4 w-4" />
          Usuários
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <DialogTitle>Usuários e Acessos</DialogTitle>
            <DialogDescription>{companyName}</DialogDescription>
          </div>
          <InviteModal
            companyId={companyId}
            companyName={companyName}
            triggerText="Novo convite"
            triggerSize="sm"
          />
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Carregando usuários...
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Membros Ativos ({members.length})
              </h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead className="text-right">Entrada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          Nenhum membro ativo cadastrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7">
                                {member.userImage && <AvatarImage src={member.userImage} />}
                                <AvatarFallback className="text-[10px] bg-muted">
                                  {(member.userName || member.userEmail).slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium leading-none">
                                  {member.userName || "Sem nome"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {member.userEmail}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.role === "admin" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                <ShieldCheckIcon className="h-3 w-3" />
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                <UserIcon className="h-3 w-3" />
                                Membro
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                              new Date(member.createdAt),
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {pendingInvites.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Convites / Links de Primeiro Acesso Pendentes ({pendingInvites.length})
                </h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Papel</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvites.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="text-sm font-medium">{inv.email}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {inv.role === "admin" ? "Admin" : "Membro"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleCopy(inv.token)}
                            >
                              {copiedToken === inv.token ? (
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

