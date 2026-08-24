"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyIcon, DownloadIcon, EyeIcon, EyeOffIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  downloadIssuerCertificate,
  fetchIssuerCertificatePassword,
  removeIssuerCertificate,
  uploadIssuerCertificate,
  validateIssuerCertificate,
} from "@/lib/certificate-file-upload";
import { formatDate } from "@/lib/format-currency";

type IssuerCertificateFieldProps = {
  issuerId: string;
  fileName?: string | null;
  uploadedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  subjectCn?: string | null;
};

export function IssuerCertificateField({
  issuerId,
  fileName,
  uploadedAt,
  expiresAt,
  subjectCn,
}: IssuerCertificateFieldProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [showStoredPassword, setShowStoredPassword] = useState(false);
  const [revealingPassword, setRevealingPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setShareMessage(null);
    const validationError = validateIssuerCertificate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!password) {
      setError("Informe a senha do certificado");
      return;
    }

    setUploading(true);
    try {
      await uploadIssuerCertificate(issuerId, file, password);
      setPassword("");
      setStoredPassword(null);
      setShowStoredPassword(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError(null);
    setShareMessage(null);
    try {
      await removeIssuerCertificate(issuerId);
      setStoredPassword(null);
      setShowStoredPassword(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover certificado");
    } finally {
      setRemoving(false);
    }
  };

  const handleToggleStoredPassword = async () => {
    setError(null);
    setShareMessage(null);

    if (showStoredPassword) {
      setShowStoredPassword(false);
      setStoredPassword(null);
      return;
    }

    setRevealingPassword(true);
    try {
      const revealed = await fetchIssuerCertificatePassword(issuerId);
      setStoredPassword(revealed);
      setShowStoredPassword(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível obter a senha");
    } finally {
      setRevealingPassword(false);
    }
  };

  const handleCopyStoredPassword = async () => {
    if (!storedPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(storedPassword);
      setShareMessage("Senha copiada para a área de transferência");
    } catch {
      setError("Não foi possível copiar a senha");
    }
  };

  const handleDownload = async () => {
    if (!fileName) {
      return;
    }

    setDownloading(true);
    setError(null);
    setShareMessage(null);
    try {
      await downloadIssuerCertificate(issuerId, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível baixar o certificado");
    } finally {
      setDownloading(false);
    }
  };

  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const isExpiringSoon =
    expiresDate != null && expiresDate.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <h3 className="text-base font-semibold">Certificado digital A1</h3>
        <p className="text-sm text-muted-foreground">
          Arquivo .pfx criptografado no armazenamento seguro. Necessário para emissão NFS-e.
        </p>
      </div>

      {fileName ? (
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">Arquivo:</span> {fileName}
          </p>
          {subjectCn ? (
            <p>
              <span className="font-medium">Titular:</span> {subjectCn}
            </p>
          ) : null}
          {uploadedAt ? (
            <p>
              <span className="font-medium">Enviado em:</span> {formatDate(new Date(uploadedAt))}
            </p>
          ) : null}
          {expiresDate ? (
            <p className={isExpiringSoon ? "text-amber-700" : undefined}>
              <span className="font-medium">Validade:</span> {formatDate(expiresDate)}
              {isExpiringSoon ? " (expira em breve)" : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum certificado configurado.</p>
      )}

      {fileName ? (
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">Compartilhar com contador</p>
            <p className="text-xs text-muted-foreground">
              Baixe o arquivo .pfx e revele a senha para enviar com segurança a quem precisar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={downloading}
              onClick={() => void handleDownload()}
            >
              <DownloadIcon className="mr-2 size-4" />
              {downloading ? "Baixando..." : "Baixar certificado"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stored-certificate-password">Senha salva</Label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Input
                  id="stored-certificate-password"
                  readOnly
                  type={showStoredPassword ? "text" : "password"}
                  value={showStoredPassword && storedPassword ? storedPassword : "••••••••"}
                  className="pr-10 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                  aria-label={showStoredPassword ? "Ocultar senha salva" : "Mostrar senha salva"}
                  disabled={revealingPassword}
                  onClick={() => void handleToggleStoredPassword()}
                >
                  {showStoredPassword ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
              </div>
              {showStoredPassword && storedPassword ? (
                <Button type="button" variant="outline" onClick={() => void handleCopyStoredPassword()}>
                  <CopyIcon className="mr-2 size-4" />
                  Copiar
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="certificate-password">
            {fileName ? "Senha (obrigatória ao substituir)" : "Senha do certificado"}
          </Label>
          <div className="relative">
            <Input
              id="certificate-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pfx,.p12"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
            }}
          />
          <Button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon className="mr-2 size-4" />
            {uploading ? "Enviando..." : fileName ? "Substituir certificado" : "Enviar certificado"}
          </Button>
          {fileName ? (
            <Button type="button" variant="outline" disabled={removing} onClick={() => void handleRemove()}>
              <Trash2Icon className="mr-2 size-4" />
              Remover
            </Button>
          ) : null}
        </div>
      </div>

      {shareMessage ? <p className="text-sm text-muted-foreground">{shareMessage}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
