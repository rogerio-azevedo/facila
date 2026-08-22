"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";

import {
  createClientWithAddressAction,
  updateClientWithAddressAction,
} from "@/actions/clients";
import { geocodeAddressAction } from "@/actions/geocode";
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
import {
  formatCep,
  formatCnpj,
  formatCpf,
  formatPhone,
} from "@/lib/format-document";
import type { ClientFormState } from "@/schemas/clients";

const AddressMap = dynamic(
  () => import("@/components/clients/address-map").then((m) => m.AddressMap),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" /> },
);

type ClientFields = {
  name: string;
  personType: "individual" | "organization";
  document: string;
  legalName: string;
  tradeName: string;
  stateRegistration: string;
  icmsTaxpayerIndicator: "taxpayer" | "exempt" | "non_taxpayer";
  municipalRegistration: string;
  email: string;
  phone: string;
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

type ClientFormProps = {
  mode: "create" | "edit";
  clientId?: string;
  initialClient?: Partial<ClientFields>;
  initialAddress?: Partial<AddressFields> & {
    latitude?: number;
    longitude?: number;
  };
};

const defaultClient: ClientFields = {
  name: "",
  personType: "individual",
  document: "",
  legalName: "",
  tradeName: "",
  stateRegistration: "",
  icmsTaxpayerIndicator: "non_taxpayer",
  municipalRegistration: "",
  email: "",
  phone: "",
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

export function ClientForm({ mode, clientId, initialClient, initialAddress }: ClientFormProps) {
  const [client, setClient] = useState<ClientFields>({
    ...defaultClient,
    ...initialClient,
  });
  const [address, setAddress] = useState<AddressFields>({
    ...defaultAddress,
    ...initialAddress,
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(() => ({
    lat: initialAddress?.latitude ?? BRAZIL_CENTER.lat,
    lng: initialAddress?.longitude ?? BRAZIL_CENTER.lng,
  }));
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [formState, setFormState] = useState<ClientFormState>({});
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

  function updateClientField<K extends keyof ClientFields>(key: K, value: ClientFields[K]) {
    setClient((prev) => ({ ...prev, [key]: value }));
  }

  function updateAddressField<K extends keyof AddressFields>(key: K, value: AddressFields[K]) {
    setAddress((prev) => ({ ...prev, [key]: value }));
  }

  function handleDocumentChange(raw: string) {
    const digits = raw.replace(/\D/g, "");
    const formatted =
      client.personType === "individual" ? formatCpf(digits) : formatCnpj(digits);
    updateClientField("document", formatted);
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
      const payload = {
        client: {
          ...client,
          document: client.document.replace(/\D/g, ""),
        },
        address: {
          ...address,
          postalCode: address.postalCode.replace(/\D/g, ""),
          codMunicipioIbge: address.codMunicipioIbge.replace(/\D/g, ""),
          latitude: coords.lat,
          longitude: coords.lng,
          ownerType: "client" as const,
          type: "main" as const,
        },
      };

      if (mode === "create") {
        const result = await createClientWithAddressAction(payload);
        if (result.errors) setFormState(result);
      } else if (clientId) {
        const result = await updateClientWithAddressAction(clientId, payload);
        setFormState(result);
      }
    });
  }

  const clientErrors = formState.errors?.client;
  const addressErrors = formState.errors?.address;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados fiscais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="personType">Tipo de pessoa</Label>
            <Select
              value={client.personType}
              onValueChange={(v) =>
                updateClientField("personType", v as ClientFields["personType"])
              }
            >
              <SelectTrigger id="personType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Pessoa física</SelectItem>
                <SelectItem value="organization">Pessoa jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="document">{client.personType === "individual" ? "CPF" : "CNPJ"}</Label>
            <Input
              id="document"
              value={client.document}
              onChange={(e) => handleDocumentChange(e.target.value)}
              required
            />
            {clientErrors?.document?.map((err) => (
              <p key={err} className="text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome de exibição</Label>
            <Input
              id="name"
              value={client.name}
              onChange={(e) => updateClientField("name", e.target.value)}
              required
            />
            {clientErrors?.name?.map((err) => (
              <p key={err} className="text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalName">Razão social / nome completo</Label>
            <Input
              id="legalName"
              value={client.legalName}
              onChange={(e) => updateClientField("legalName", e.target.value)}
              required
            />
            {clientErrors?.legalName?.map((err) => (
              <p key={err} className="text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>
          {client.personType === "organization" && (
            <div className="space-y-2">
              <Label htmlFor="tradeName">Nome fantasia</Label>
              <Input
                id="tradeName"
                value={client.tradeName}
                onChange={(e) => updateClientField("tradeName", e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="icmsTaxpayerIndicator">Indicador ICMS</Label>
            <Select
              value={client.icmsTaxpayerIndicator}
              onValueChange={(v) =>
                updateClientField(
                  "icmsTaxpayerIndicator",
                  v as ClientFields["icmsTaxpayerIndicator"],
                )
              }
            >
              <SelectTrigger id="icmsTaxpayerIndicator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non_taxpayer">Não contribuinte</SelectItem>
                <SelectItem value="taxpayer">Contribuinte ICMS</SelectItem>
                <SelectItem value="exempt">Isento de IE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stateRegistration">Inscrição estadual</Label>
            <Input
              id="stateRegistration"
              value={client.stateRegistration}
              onChange={(e) => updateClientField("stateRegistration", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="municipalRegistration">Inscrição municipal</Label>
            <Input
              id="municipalRegistration"
              value={client.municipalRegistration}
              onChange={(e) => updateClientField("municipalRegistration", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail de cobrança</Label>
            <Input
              id="email"
              type="email"
              value={client.email}
              onChange={(e) => updateClientField("email", e.target.value)}
            />
            {clientErrors?.email?.map((err) => (
              <p key={err} className="text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={client.phone}
              onChange={(e) => updateClientField("phone", formatPhone(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="postalCode">CEP</Label>
              <Input
                id="postalCode"
                value={address.postalCode}
                onChange={(e) => updateAddressField("postalCode", formatCep(e.target.value))}
                required
              />
              {addressErrors?.postalCode?.map((err) => (
                <p key={err} className="text-sm text-destructive">
                  {err}
                </p>
              ))}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street">Logradouro</Label>
              <Input
                id="street"
                value={address.street}
                onChange={(e) => updateAddressField("street", e.target.value)}
                required
              />
              {addressErrors?.street?.map((err) => (
                <p key={err} className="text-sm text-destructive">
                  {err}
                </p>
              ))}
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
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={address.complement}
                onChange={(e) => updateAddressField("complement", e.target.value)}
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
              {addressErrors?.neighborhood?.map((err) => (
                <p key={err} className="text-sm text-destructive">
                  {err}
                </p>
              ))}
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
            <div className="space-y-2">
              <Label htmlFor="codMunicipioIbge">Código IBGE</Label>
              <Input
                id="codMunicipioIbge"
                value={address.codMunicipioIbge}
                onChange={(e) => updateAddressField("codMunicipioIbge", e.target.value)}
                required
              />
              {addressErrors?.codMunicipioIbge?.map((err) => (
                <p key={err} className="text-sm text-destructive">
                  {err}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={handleGeocode} disabled={geocoding}>
              {geocoding ? "Buscando..." : "Buscar no mapa"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Clique no mapa para ajustar a localização.
            </p>
          </div>
          {geocodeError && <p className="text-sm text-destructive">{geocodeError}</p>}

          <AddressMap
            latitude={coords.lat}
            longitude={coords.lng}
            flyTarget={flyTarget}
            onMapClick={(next) => {
              setCoords(next);
              setFlyTarget(null);
            }}
          />
        </CardContent>
      </Card>

      {formState.errors?.form?.map((err) => (
        <p key={err} className="text-sm text-destructive">
          {err}
        </p>
      ))}
      {formState.success && (
        <p className="text-sm text-muted-foreground">Cliente atualizado com sucesso.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : mode === "create" ? "Cadastrar cliente" : "Salvar alterações"}
      </Button>
    </form>
  );
}
