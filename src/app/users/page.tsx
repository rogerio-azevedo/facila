import { PageHeader } from "@/components/page-header";
import { InviteModal } from "@/components/team/invite-modal";
import { MembersTable } from "@/components/team/members-table";
import { PendingInvitesCard } from "@/components/team/pending-invites-card";
import { listInvitationsByCompanyId } from "@/server/dal/company-invitations";
import { listMembersWithUsers } from "@/server/dal/company-members";
import { requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export default async function UsersPage() {
  const ctx = await requireCompanyContext();
  const canManage = can(ctx, "company-members:manage");

  const [members, invitations] = await Promise.all([
    listMembersWithUsers(ctx.companyId),
    listInvitationsByCompanyId(ctx.companyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie os membros da sua equipe e convide novos usuários para a empresa."
        actions={canManage ? <InviteModal /> : null}
      />

      <div className="space-y-6">
        <MembersTable
          members={members}
          currentUserId={ctx.userId}
          canManage={canManage}
        />

        <PendingInvitesCard
          invitations={invitations}
          canManage={canManage}
        />
      </div>
    </div>
  );
}

