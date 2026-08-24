import { z } from "zod";

export const serviceInvoiceStatusSchema = z.enum([
  "pending",
  "authorized",
  "rejected",
  "canceled",
  "error",
  "pending_retry",
]);

export const accountReceivableNfseStatusSchema = z.enum([
  "none",
  "pending",
  "authorized",
  "rejected",
  "error",
  "canceled",
]);

export const emitServiceInvoiceSchema = z.object({
  accountReceivableId: z.string().uuid(),
  issuerId: z.string().uuid().optional(),
  issuerServiceProfileId: z.string().uuid().optional(),
});

export type EmitServiceInvoiceInput = z.infer<typeof emitServiceInvoiceSchema>;

export const cancelServiceInvoiceSchema = z.object({
  serviceInvoiceId: z.string().uuid(),
  reason: z.string().min(15, { error: "Motivo deve ter ao menos 15 caracteres" }).max(255),
});

export type CancelServiceInvoiceInput = z.infer<typeof cancelServiceInvoiceSchema>;

export const serviceInvoiceStatusLabels: Record<
  z.infer<typeof serviceInvoiceStatusSchema>,
  string
> = {
  pending: "Pendente",
  authorized: "Autorizada",
  rejected: "Rejeitada",
  canceled: "Cancelada",
  error: "Erro",
  pending_retry: "Aguardando retry",
};

export const accountReceivableNfseStatusLabels: Record<
  z.infer<typeof accountReceivableNfseStatusSchema>,
  string
> = {
  none: "Sem NFS-e",
  pending: "Emitindo",
  authorized: "NFS-e autorizada",
  rejected: "NFS-e rejeitada",
  error: "Erro na NFS-e",
  canceled: "NFS-e cancelada",
};

export type EmitServiceInvoiceFormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
  retryPending?: boolean;
  serviceInvoiceId?: string;
  dpsNumber?: number;
  accessKey?: string;
};

export const serviceInvoiceEnvironmentSchema = z.enum(["homologacao", "producao"]);

export const serviceInvoiceListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ""),
  status: serviceInvoiceStatusSchema.optional(),
  environment: serviceInvoiceEnvironmentSchema.optional(),
  issuerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .catch(10)
    .transform((value) => ([10, 20, 50].includes(value) ? value : 10)),
});

export type ServiceInvoiceListQuery = z.infer<typeof serviceInvoiceListQuerySchema>;

export function parseServiceInvoiceListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ServiceInvoiceListQuery {
  const get = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : undefined;
  };

  return serviceInvoiceListQuerySchema.parse({
    q: get("q"),
    status: get("status"),
    environment: get("environment"),
    issuerId: get("issuerId"),
    page: get("page"),
    pageSize: get("pageSize"),
  });
}

export const serviceInvoiceEnvironmentLabels: Record<
  z.infer<typeof serviceInvoiceEnvironmentSchema>,
  string
> = {
  homologacao: "Homologação",
  producao: "Produção",
};
