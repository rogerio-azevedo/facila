"use client";

import dynamic from "next/dynamic";
import { PencilIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import {
  createIssuerWithAddressAction,
  updateIssuerWithAddressAction,
} from "@/actions/issuers";
import { geocodeAddressAction } from "@/actions/geocode";
import {
  AsyncCombobox,
  CnaeCombobox,
  searchMunicipalitiesCombobox,
} from "@/components/issuers/async-combobox";
import {
  buildProfileFormForCnae,
  IssuerServiceProfileDialog,
  profileFormToInput,
  type ProfileFormState,
} from "@/components/issuers/issuer-service-profile-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCep, formatCnpj, formatPhone } from "@/lib/format-document";
import { formatCnaeLine, stripCnaeCodePrefix } from "@/lib/format-cnae";
import {
  REG_AP_TRIB_SN_OPTIONS,
  REG_ESP_TRIB_OPTIONS,
} from "@/lib/nfse-tributacao-options";
import type { IssuerFormState } from "@/schemas/issuers";

const AddressMap = dynamic(
  () => import("@/components/clients/address-map").then((m) => m.AddressMap),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" /> },
);

type IssuerFields = {
  legalName: string;
  tradeName: string;
  cnpj: string;
  municipalRegistration: string;
  stateRegistration: string;
  codMunicipioIbge: string;
  municipalityLabel: string;
  email: string;
  phone: string;
  opSimpNac: "1" | "2" | "3";
  regApTribSn: "1" | "2" | "3" | "";
  regEspTrib: "0" | "1" | "2" | "3" | "4" | "5" | "6";
  incentivadorCultural: boolean;
  dpsSeries: string;
  nextDpsNumber: string;
  environment: "homologacao" | "producao";
  status: "active" | "inactive";
  isDefault: boolean;
};

type AddressFields = {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  codMunicipioIbge: string;
};

type CnaeSelection = {
  code: string;
  label: string;
  isPrimary: boolean;
};

type IssuerFormProps = {
  mode: "create" | "edit";
  issuerId?: string;
  initialIssuer?: Partial<IssuerFields>;
  initialAddress?: Partial<AddressFields> & { latitude?: number; longitude?: number };
  initialCnaes?: CnaeSelection[];
  showSimplesFields?: boolean;
};

const defaultIssuer: IssuerFields = {
  legalName: "",
  tradeName: "",
  cnpj: "",
  municipalRegistration: "",
  stateRegistration: "",
  codMunicipioIbge: "",
  municipalityLabel: "",
  email: "",
  phone: "",
  opSimpNac: "1",
  regApTribSn: "",
  regEspTrib: "0",
  incentivadorCultural: false,
  dpsSeries: "1",
  nextDpsNumber: "1",
  environment: "homologacao",
  status: "active",
  isDefault: false,
};

const defaultAddress: AddressFields = {
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  postalCode: "",
  codMunicipioIbge: "",
};

const BRAZIL_CENTER = { lat: -15.78, lng: -47.92 };

export function IssuerForm({
  mode,
  issuerId,
  initialIssuer,
  initialAddress,
  initialCnaes = [],
  showSimplesFields = false,
}: IssuerFormProps) {
  const isCreateMode = mode === "create";
  const [issuer, setIssuer] = useState<IssuerFields>({ ...defaultIssuer, ...initialIssuer });
  const [address, setAddress] = useState<AddressFields>({ ...defaultAddress, ...initialAddress });
  const [cnaes, setCnaes] = useState<CnaeSelection[]>(initialCnaes);
  const [draftProfiles, setDraftProfiles] = useState<Record<string, ProfileFormState>>({});
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingCnae, setEditingCnae] = useState<CnaeSelection | null>(null);
  const [profileDialogForm, setProfileDialogForm] = useState<ProfileFormState | null>(null);
  const [coords, setCoords] = useState(() => ({
    lat: initialAddress?.latitude ?? BRAZIL_CENTER.lat,
    lng: initialAddress?.longitude ?? BRAZIL_CENTER.lng,
  }));
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [formState, setFormState] = useState<IssuerFormState>({});
  const [cnaeComboboxKey, setCnaeComboboxKey] = useState(0);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [geocoding, startGeocode] = useTransition();

  useEffect(() => {
    const zip = address.postalCode.replace(/\D/g, "");
    if (zip.length !== 8) return;

    const controller = new AbortController();
    fetch(`https://viacep.com.br/ws/${zip}/json/`, { signal: controller.signal })
      .then((res) => res.json())
      .then((cep: { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string; ibge?: string }) => {
        if (cep.erro) return;
        setAddress((cur) => ({
          ...cur,
          street: cur.street || cep.logradouro || "",
          neighborhood: cur.neighborhood || cep.bairro || "",
          city: cur.city || cep.localidade || "",
          state: cur.state || cep.uf || "",
          codMunicipioIbge: cur.codMunicipioIbge || cep.ibge || "",
        }));
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [address.postalCode]);

  function updateIssuerField<K extends keyof IssuerFields>(key: K, value: IssuerFields[K]) {
    setIssuer((prev) => ({ ...prev, [key]: value }));
  }

  function updateAddressField<K extends keyof AddressFields>(key: K, value: AddressFields[K]) {
    setAddress((prev) => ({ ...prev, [key]: value }));
  }

  function addCnae(option: { value: string; label: string; description?: string }) {
    setCnaes((prev) => {
      if (prev.some((item) => item.code === option.value)) {
        return prev;
      }

      const description = stripCnaeCodePrefix(
        option.value,
        option.description ?? option.label,
      );

      return [
        ...prev,
        {
          code: option.value,
          label: description,
          isPrimary: prev.length === 0,
        },
      ];
    });
    setCnaeComboboxKey((current) => current + 1);
  }

  function setPrimaryCnae(code: string) {
    setCnaes((prev) => prev.map((item) => ({ ...item, isPrimary: item.code === code })));
  }

  function removeCnae(code: string) {
    setCnaes((prev) => {
      const next = prev.filter((item) => item.code !== code);
      if (next.length > 0 && !next.some((item) => item.isPrimary)) {
        next[0]!.isPrimary = true;
      }
      return next;
    });
    setDraftProfiles((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
  }

  async function openCnaeTributacao(cnae: CnaeSelection) {
    setEditingCnae(cnae);

    const draftProfile = draftProfiles[cnae.code];
    if (draftProfile) {
      setProfileDialogForm(draftProfile);
      setProfileDialogOpen(true);
      return;
    }

    const initialForm = await buildProfileFormForCnae(cnae);
    setProfileDialogForm(initialForm);
    setProfileDialogOpen(true);
  }

  function hasTributacaoConfigured(cnaeCode: string) {
    return Boolean(draftProfiles[cnaeCode]);
  }

  function handleGeocode() {
    startGeocode(async () => {
      setGeocodeError(null);
      const result = await geocodeAddressAction({
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
      });
      if (result.error) {
        setGeocodeError(result.error);
        return;
      }
      if (result.lat !== undefined && result.lng !== undefined) {
        setCoords({ lat: result.lat, lng: result.lng });
        setFlyTarget({ lat: result.lat, lng: result.lng });
      }
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const { municipalityLabel: _municipalityLabel, ...issuerFields } = issuer;
      const payload = {
        issuer: {
          ...issuerFields,
          cnpj: issuer.cnpj.replace(/\D/g, ""),
          nextDpsNumber: issuer.nextDpsNumber.trim() === "" ? 1 : issuer.nextDpsNumber,
          ...(isCreateMode
            ? {
                cnaes: cnaes.map((item) => ({ code: item.code, isPrimary: item.isPrimary })),
              }
            : {}),
        },
        address: {
          ...address,
          postalCode: address.postalCode.replace(/\D/g, ""),
          codMunicipioIbge: address.codMunicipioIbge.replace(/\D/g, ""),
          latitude: coords.lat,
          longitude: coords.lng,
          ownerType: "issuer" as const,
          type: "main" as const,
        },
        ...(isCreateMode
          ? {
              serviceProfiles: Object.values(draftProfiles).map((item) =>
                profileFormToInput(item),
              ),
            }
          : {}),
      };

      if (isCreateMode) {
        const result = await createIssuerWithAddressAction(payload);
        setFormState(result);
      } else if (issuerId) {
        const result = await updateIssuerWithAddressAction(issuerId, payload);
        setFormState(result);
      }
    });
  }

  const issuerErrors = formState.errors?.issuer;
  const addressErrors = formState.errors?.address;
  const validationMessages = [
    ...(formState.errors?.form ?? []),
    ...Object.values(issuerErrors ?? {}).flatMap((messages) => messages ?? []),
    ...Object.values(addressErrors ?? {}).flatMap((messages) => messages ?? []),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {validationMessages.length > 0 ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {validationMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Dados do emissor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <AsyncCombobox
              label="Município emissor (IBGE)"
              placeholder="Busque por cidade ou código IBGE"
              value={issuer.codMunicipioIbge}
              displayValue={issuer.municipalityLabel}
              searchAction={searchMunicipalitiesCombobox}
              onSelect={(option) => {
                updateIssuerField("codMunicipioIbge", option.value);
                updateIssuerField("municipalityLabel", option.label);
              }}
              error={issuerErrors?.codMunicipioIbge?.[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalName">Razão social</Label>
            <Input
              id="legalName"
              value={issuer.legalName}
              onChange={(e) => updateIssuerField("legalName", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tradeName">Nome fantasia</Label>
            <Input
              id="tradeName"
              value={issuer.tradeName}
              onChange={(e) => updateIssuerField("tradeName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={issuer.cnpj}
              onChange={(e) => updateIssuerField("cnpj", formatCnpj(e.target.value))}
              required
            />
            {issuerErrors?.cnpj?.map((err) => (
              <p key={err} className="text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="municipalRegistration">Inscrição municipal</Label>
            <Input
              id="municipalRegistration"
              value={issuer.municipalRegistration}
              onChange={(e) => updateIssuerField("municipalRegistration", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={issuer.email}
              onChange={(e) => updateIssuerField("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={issuer.phone}
              onChange={(e) => updateIssuerField("phone", formatPhone(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opSimpNac">Simples Nacional</Label>
            <Select
              value={issuer.opSimpNac}
              onValueChange={(value) => updateIssuerField("opSimpNac", value as IssuerFields["opSimpNac"])}
            >
              <SelectTrigger id="opSimpNac">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Não optante</SelectItem>
                <SelectItem value="2">MEI</SelectItem>
                <SelectItem value="3">ME/EPP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {issuer.opSimpNac === "3" ? (
            <div className="space-y-2">
              <Label htmlFor="regApTribSn">Reg. apuração Simples Nacional</Label>
              <Select
                value={issuer.regApTribSn || ""}
                onValueChange={(value) =>
                  updateIssuerField("regApTribSn", value as IssuerFields["regApTribSn"])
                }
              >
                <SelectTrigger id="regApTribSn">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {REG_AP_TRIB_SN_OPTIONS.filter((option) => option.value !== "").map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {issuerErrors?.regApTribSn?.map((err) => (
                <p key={err} className="text-sm text-destructive">
                  {err}
                </p>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="regEspTrib">Regime especial de tributação</Label>
            <Select
              value={issuer.regEspTrib}
              onValueChange={(value) =>
                updateIssuerField("regEspTrib", value as IssuerFields["regEspTrib"])
              }
            >
              <SelectTrigger id="regEspTrib">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REG_ESP_TRIB_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="environment">Ambiente NFS-e</Label>
            <Select
              value={issuer.environment}
              onValueChange={(value) =>
                updateIssuerField("environment", value as IssuerFields["environment"])
              }
            >
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homologacao">Homologação</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dpsSeries">Série DPS</Label>
            <Input
              id="dpsSeries"
              value={issuer.dpsSeries}
              onChange={(e) => updateIssuerField("dpsSeries", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextDpsNumber">Próximo RPS</Label>
            <Input
              id="nextDpsNumber"
              type="number"
              min={1}
              step={1}
              value={issuer.nextDpsNumber}
              onChange={(e) => updateIssuerField("nextDpsNumber", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Deve coincidir com o próximo número na prefeitura (última NFS-e + 1).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={issuer.status}
              onValueChange={(value) => updateIssuerField("status", value as IssuerFields["status"])}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={issuer.isDefault}
              onChange={(event) => updateIssuerField("isDefault", event.target.checked)}
            />
            Emissor padrão da empresa
          </label>
        </CardContent>
      </Card>

      {isCreateMode ? (
        <Card>
          <CardHeader>
            <CardTitle>CNAEs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adicione os CNAEs do emissor e configure a tributação de cada um pelo botão editar.
              Após salvar, a gestão fica na seção Tributações.
            </p>
            <CnaeCombobox
              key={cnaeComboboxKey}
              label="Adicionar CNAE"
              value=""
              onSelect={addCnae}
              error={issuerErrors?.cnaes?.[0]}
            />
            {cnaes.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">CNAE</th>
                      <th className="px-3 py-2 font-medium w-28 text-center">Principal</th>
                      <th className="px-3 py-2 font-medium w-32 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cnaes.map((item) => (
                      <tr key={item.code} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <span>{formatCnaeLine(item.code, item.label)}</span>
                            {hasTributacaoConfigured(item.code) ? (
                              <span className="text-xs text-muted-foreground">Tributação configurada</span>
                            ) : (
                              <span className="text-xs text-amber-700">Tributação pendente</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="radio"
                            name="primary-cnae"
                            checked={item.isPrimary}
                            onChange={() => setPrimaryCnae(item.code)}
                            aria-label={`Marcar ${formatCnaeLine(item.code, item.label)} como principal`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Editar tributação do CNAE ${formatCnaeLine(item.code, item.label)}`}
                              onClick={() => void openCnaeTributacao(item)}
                            >
                              <PencilIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeCnae(item.code)}
                            >
                              Remover
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum CNAE adicionado.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="postalCode">CEP</Label>
            <Input
              id="postalCode"
              value={address.postalCode}
              onChange={(e) => updateAddressField("postalCode", formatCep(e.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street">Logradouro</Label>
            <Input
              id="street"
              value={address.street}
              onChange={(e) => updateAddressField("street", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              value={address.number}
              onChange={(e) => updateAddressField("number", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={address.neighborhood}
              onChange={(e) => updateAddressField("neighborhood", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={address.city}
              onChange={(e) => updateAddressField("city", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">UF</Label>
            <Input
              id="state"
              value={address.state}
              onChange={(e) => updateAddressField("state", e.target.value.toUpperCase())}
              maxLength={2}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Button type="button" variant="outline" onClick={handleGeocode} disabled={geocoding}>
              {geocoding ? "Localizando..." : "Localizar no mapa"}
            </Button>
            {geocodeError ? <p className="mt-2 text-sm text-destructive">{geocodeError}</p> : null}
            {addressErrors?.codMunicipioIbge?.map((err) => (
              <p key={err} className="mt-2 text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>
          <div className="md:col-span-2">
            <AddressMap
              latitude={coords.lat}
              longitude={coords.lng}
              flyTarget={flyTarget}
              onMapClick={(nextCoords) => setCoords(nextCoords)}
            />
          </div>
        </CardContent>
      </Card>

      {formState.errors?.form?.map((err) => (
        <p key={err} className="text-sm text-destructive">
          {err}
        </p>
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar emissor" : "Salvar alterações"}
        </Button>
      </div>

      {isCreateMode ? (
        <IssuerServiceProfileDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          initialForm={profileDialogForm}
          lockCnae={Boolean(editingCnae)}
          showSimplesFields={issuer.opSimpNac !== "1"}
          requirePTotTribSn={issuer.opSimpNac === "3"}
          onDraftSave={(form) => {
            if (!editingCnae) {
              return;
            }
            setDraftProfiles((prev) => ({
              ...prev,
              [editingCnae.code]: form,
            }));
          }}
        />
      ) : null}
    </form>
  );
}
