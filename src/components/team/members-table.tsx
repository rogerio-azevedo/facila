"use client";

import { useState } from "react";
import { MoreHorizontalIcon, ShieldCheckIcon, UserIcon, UserMinusIcon } from "lucide-react";

import { removeCompanyMemberAction, updateCompanyMemberRoleAction } from "@/actions/company-members";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompanyMemberWithUser } from "@/server/dal/company-members";

type MembersTableProps = {
  members: CompanyMemberWithUser[];
  currentUserId: string;
  canManage: boolean;
};

export function MembersTable({ members, currentUserId, canManage }: MembersTableProps) {
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, newRole: "admin" | "member") {
    setActionError(null);
    setLoadingMemberId(memberId);
    try {
      const result = await updateCompanyMemberRoleAction({
        memberId,
        role: newRole,
      });
      if (result.error) {
        setActionError(result.error);
      }
    } catch {
      setActionError("Erro ao alterar o papel do usuário.");
    } finally {
      setLoadingMemberId(null);
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Tem certeza que deseja remover ${memberName} desta empresa?`)) {
      return;
    }
    setActionError(null);
    setLoadingMemberId(memberId);
    try {
      const result = await removeCompanyMemberAction({ memberId });
      if (result.error) {
        setActionError(result.error);
      }
    } catch {
      setActionError("Erro ao remover o membro.");
    } finally {
      setLoadingMemberId(null);
    }
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {actionError}
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Membro desde</TableHead>
              {canManage && <TableHead className="w-[80px] text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const initials = (member.userName || member.userEmail)
                .slice(0, 2)
                .toUpperCase();

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {member.userImage && <AvatarImage src={member.userImage} />}
                        <AvatarFallback className="text-xs font-semibold bg-muted">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-1.5">
                          {member.userName || "Sem nome"}
                          {isSelf && (
                            <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.2">
                              você
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <ShieldCheckIcon className="h-3 w-3" />
                        Administrador
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <UserIcon className="h-3 w-3" />
                        Membro
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                      new Date(member.createdAt),
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={loadingMemberId === member.id}
                          >
                            <MoreHorizontalIcon className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Permissões</DropdownMenuLabel>
                          {member.role === "member" ? (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.id, "admin")}
                            >
                              <ShieldCheckIcon className="mr-2 h-4 w-4" />
                              Promover a Administrador
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.id, "member")}
                            >
                              <UserIcon className="mr-2 h-4 w-4" />
                              Alterar para Membro
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              handleRemoveMember(member.id, member.userName || member.userEmail)
                            }
                          >
                            <UserMinusIcon className="mr-2 h-4 w-4" />
                            Remover da empresa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

