"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, FileIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  removeContractPdf,
  uploadContractPdf,
  validateContractPdf,
} from "@/lib/contract-file-upload";

type ContractFileFieldProps = {
  mode: "create" | "edit";
  contractId?: string;
  fileName?: string | null;
  fileUploadedAt?: Date | string | null;
  pendingFile?: File | null;
  onPendingFileChange?: (file: File | null) => void;
  disabled?: boolean;
};

export function ContractFileField({
  mode,
  contractId,
  fileName: initialFileName,
  fileUploadedAt: initialUploadedAt,
  pendingFile,
  onPendingFileChange,
  disabled = false,
}: ContractFileFieldProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [fileName, setFileName] = useState(initialFileName ?? null);
  const [fileUploadedAt, setFileUploadedAt] = useState(initialUploadedAt ?? null);
  const [error, setError] = useState<string | null>(null);

  const isCreate = mode === "create";
  const displayName = isCreate ? pendingFile?.name ?? null : fileName;
  const hasFile = Boolean(displayName);

  const handleFile = async (file: File) => {
    setError(null);

    const validationError = validateContractPdf(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (isCreate) {
      onPendingFileChange?.(file);
      return;
    }

    if (!contractId) {
      return;
    }

    setUploading(true);

    try {
      await uploadContractPdf(contractId, file);
      setFileName(file.name);
      setFileUploadedAt(new Date().toISOString());
      onPendingFileChange?.(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível anexar o contrato.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownload = () => {
    if (!contractId) {
      return;
    }

    window.open(`/api/contracts/${contractId}/file`, "_blank", "noopener,noreferrer");
  };

  const handleRemove = async () => {
    setError(null);

    if (isCreate) {
      onPendingFileChange?.(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (!contractId || !window.confirm("Remover o contrato anexado?")) {
      return;
    }

    setRemoving(true);

    try {
      await removeContractPdf(contractId);
      setFileName(null);
      setFileUploadedAt(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover o contrato.");
    } finally {
      setRemoving(false);
    }
  };

  const uploadedAtLabel = !isCreate && fileUploadedAt
    ? new Date(fileUploadedAt).toLocaleString("pt-BR")
    : null;

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="application/pdf,.pdf"
        ref={fileInputRef}
        className="hidden"
        disabled={disabled || uploading || removing}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
      />

      {hasFile ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <FileIcon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate font-medium">{displayName}</p>
              {isCreate ? (
                <p className="text-sm text-muted-foreground">
                  Será enviado ao salvar o contrato.
                </p>
              ) : uploadedAtLabel ? (
                <p className="text-sm text-muted-foreground">Enviado em {uploadedAtLabel}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isCreate ? (
              <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
                <DownloadIcon />
                Baixar
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading || removing}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon />
              Substituir
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading || removing}
              onClick={() => void handleRemove()}
            >
              <Trash2Icon className="text-destructive" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);

            const file = event.dataTransfer.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
            isDragging
              ? "border-primary bg-accent/50"
              : "border-input bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
            (disabled || uploading) && "cursor-not-allowed opacity-50",
          )}
        >
          <UploadIcon className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {uploading ? "Enviando..." : "Arraste o PDF assinado ou clique para selecionar"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Apenas PDF, até 20 MB
              {isCreate ? " — o envio ocorre ao criar o contrato" : ""}
            </p>
          </div>
        </button>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
