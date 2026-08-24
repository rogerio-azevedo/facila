"use client";

import { PencilIcon, SearchIcon, StarIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  consultarCadastroMunicipalAction,
  deleteIssuerServiceProfileAction,
  setDefaultIssuerServiceProfileAction,
} from "@/actions/issuer-service-profiles";
import {
  IssuerServiceProfileDialog,
  type ProfileFormState,
} from "@/components/issuers/issuer-service-profile-dialog";
import { MunicipalCadastroActivitiesDialog } from "@/components/issuers/municipal-cadastro-activities-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCnaeLine } from "@/lib/format-cnae";
import { CUIABA_IBGE } from "@/lib/nfse-issnet";
import type { MunicipalCadastroActivity } from "@/schemas/municipal-cadastro";
import type { IssuerServiceProfileListItem } from "@/server/dal/issuer-service-profiles";

type IssuerServiceProfilesSectionProps = {
  issuerId: string;
  codMunicipioIbge: string;
  profiles: IssuerServiceProfileListItem[];
  showSimplesFields?: boolean;
  requirePTotTribSn?: boolean;
};

export function IssuerServiceProfilesSection({
  issuerId,
  codMunicipioIbge,
  profiles,
  showSimplesFields = false,
  requirePTotTribSn = false,
}: IssuerServiceProfilesSectionProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<IssuerServiceProfileListItem | null>(null);
  const [initialForm, setInitialForm] = useState<ProfileFormState | null>(null);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroError, setCadastroError] = useState<string | null>(null);
  const [cadastroActivities, setCadastroActivities] = useState<MunicipalCadastroActivity[]>([]);
  const [cadastroMeta, setCadastroMeta] = useState<{ xNome?: string; statusCadastro?: string }>(
    {},
  );
  const [profileToDelete, setProfileToDelete] = useState<IssuerServiceProfileListItem | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  const supportsCadastroLookup = codMunicipioIbge === CUIABA_IBGE;

  function openCreateDialog(form?: ProfileFormState) {
    setEditingProfile(null);
    setInitialForm(form ?? null);
    setDialogOpen(true);
  }

  function openEditDialog(profile: IssuerServiceProfileListItem) {
    setEditingProfile(profile);
    setInitialForm(null);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setInitialForm(null);
    }
  }

  function openDeleteDialog(profile: IssuerServiceProfileListItem) {
    setProfileToDelete(profile);
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    if (!open && !deletePending) {
      setProfileToDelete(null);
    }
  }

  function confirmDelete() {
    if (!profileToDelete) {
      return;
    }

    startDeleteTransition(async () => {
      await deleteIssuerServiceProfileAction(issuerId, profileToDelete.id);
      setProfileToDelete(null);
      router.refresh();
    });
  }

  function handleSetDefault(profileId: string) {
    startTransition(async () => {
      await setDefaultIssuerServiceProfileAction(issuerId, profileId);
      router.refresh();
    });
  }

  async function handleConsultarCadastro() {
    setCadastroOpen(true);
    setCadastroLoading(true);
    setCadastroError(null);
    setCadastroActivities([]);

    const result = await consultarCadastroMunicipalAction(issuerId);
    setCadastroLoading(false);

    if (!result.success) {
      setCadastroError(result.message);
      return;
    }

    setCadastroActivities(result.atividades);
    setCadastroMeta({
      xNome: result.xNome,
      statusCadastro: result.statusCadastro,
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Tributações</h3>
          <p className="text-sm text-muted-foreground">
            Configure os perfis fiscais utilizados na emissão das notas.
            {supportsCadastroLookup
              ? " Use a consulta municipal para importar atividades ISS (em Cuiabá, costuma ser o CNAE)."
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {supportsCadastroLookup ? (
            <Button type="button" variant="outline" onClick={() => void handleConsultarCadastro()}>
              <SearchIcon className="size-4" />
              Consultar cadastro municipal
            </Button>
          ) : null}
          <Button type="button" onClick={() => openCreateDialog()}>
            Nova tributação
          </Button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma tributação cadastrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>cTribNac</TableHead>
              <TableHead>cTribMun</TableHead>
              <TableHead>Alíq. ISS (%)</TableHead>
              <TableHead>pTotTribSN (%)</TableHead>
              <TableHead>CST</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="max-w-md whitespace-normal">
                  {formatCnaeLine(profile.cnaeCode, profile.cnaeDescription ?? profile.name)}
                </TableCell>
                <TableCell>{profile.nationalServiceCode}</TableCell>
                <TableCell>{profile.municipalTaxCode ?? "—"}</TableCell>
                <TableCell>{Number(profile.issRate).toFixed(2)}</TableCell>
                <TableCell>
                  {profile.pTotTribSn != null ? Number(profile.pTotTribSn).toFixed(2) : "—"}
                </TableCell>
                <TableCell>{profile.issqnCst}</TableCell>
                <TableCell>
                  {profile.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      <StarIcon className="size-3" />
                      Padrão
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0"
                      disabled={pending}
                      onClick={() => handleSetDefault(profile.id)}
                    >
                      Tornar padrão
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar tributação"
                      onClick={() => openEditDialog(profile)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Excluir tributação"
                      disabled={pending || deletePending}
                      onClick={() => openDeleteDialog(profile)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={profileToDelete !== null} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir tributação?</DialogTitle>
            <DialogDescription>
              {profileToDelete
                ? `A tributação "${formatCnaeLine(profileToDelete.cnaeCode, profileToDelete.cnaeDescription ?? profileToDelete.name)}" será removida permanentemente.`
                : "Esta tributação será removida permanentemente."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletePending}
              onClick={() => setProfileToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              onClick={confirmDelete}
            >
              {deletePending ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MunicipalCadastroActivitiesDialog
        open={cadastroOpen}
        onOpenChange={setCadastroOpen}
        issuerId={issuerId}
        loading={cadastroLoading}
        error={cadastroError}
        activities={cadastroActivities}
        meta={cadastroMeta}
        profiles={profiles}
        requirePTotTribSn={requirePTotTribSn}
        refreshOnClose
        onCreated={() => router.refresh()}
      />

      <IssuerServiceProfileDialog
        issuerId={issuerId}
        profileId={editingProfile?.id ?? null}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        profile={editingProfile}
        initialForm={initialForm}
        showSimplesFields={showSimplesFields}
        requirePTotTribSn={requirePTotTribSn}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
