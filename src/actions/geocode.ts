"use server";

import { geocodeAddressInputSchema, type AddressFormState } from "@/schemas/addresses";
import { can } from "@/server/policies";
import { requireCompanyContext, ForbiddenError } from "@/server/dal/context";

type HereDiscoverItem = {
  position?: { lat: number; lng: number };
};

type HereDiscoverResponse = {
  items?: HereDiscoverItem[];
};

export async function geocodeAddressAction(input: unknown): Promise<AddressFormState> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:read")) {
    throw new ForbiddenError();
  }

  const parsed = geocodeAddressInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Preencha rua, número, bairro, cidade e UF antes de buscar no mapa" };
  }

  const apiKey = process.env.HERE_API_KEY;
  if (!apiKey) {
    return { error: "Geocoding não configurado (HERE_API_KEY ausente)" };
  }

  const { street, number, neighborhood, city, state, postalCode } = parsed.data;
  const parts = [street, number, neighborhood, city, state, postalCode?.replace(/\D/g, "")].filter(
    Boolean,
  );
  const query = parts.join(", ");

  const url = new URL("https://discover.search.hereapi.com/v1/geocode");
  url.searchParams.set("q", query);
  url.searchParams.set("in", "countryCode:BRA");
  url.searchParams.set("limit", "1");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return { error: "Não foi possível localizar o endereço no mapa" };
  }

  const data = (await response.json()) as HereDiscoverResponse;
  const pos = data.items?.[0]?.position;
  if (!pos) {
    return { error: "Endereço não encontrado. Ajuste os campos ou clique no mapa." };
  }

  return { lat: pos.lat, lng: pos.lng };
}
