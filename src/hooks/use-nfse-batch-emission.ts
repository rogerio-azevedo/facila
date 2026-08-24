"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition, type Dispatch, type SetStateAction } from "react";

import { emitServiceInvoiceAction } from "@/actions/service-invoices";
import {
  createPendingEmissionItems,
  mapEmitResultToProgressUpdate,
  type NfseEmissionProgressItem,
  type NfseEmissionTarget,
} from "@/lib/nfse-emission-progress";

async function runEmissionForIds(
  ids: string[],
  setItems: Dispatch<SetStateAction<NfseEmissionProgressItem[]>>,
) {
  for (const id of ids) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, state: "processing" } : item)),
    );

    const result = await emitServiceInvoiceAction({ accountReceivableId: id });
    const update = mapEmitResultToProgressUpdate(result);

    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  }
}

export function useNfseBatchEmission() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NfseEmissionProgressItem[]>([]);
  const [isPending, startTransition] = useTransition();

  const startEmission = useCallback(
    (targets: NfseEmissionTarget[]) => {
      if (targets.length === 0) {
        return;
      }

      setOpen(true);
      setItems(createPendingEmissionItems(targets));

      startTransition(async () => {
        await runEmissionForIds(
          targets.map((target) => target.id),
          setItems,
        );
        router.refresh();
      });
    },
    [router],
  );

  const retryFailed = useCallback(() => {
    const failedIds = items.filter((item) => item.state === "error").map((item) => item.id);

    if (failedIds.length === 0) {
      return;
    }

    setItems((current) =>
      current.map((item) =>
        failedIds.includes(item.id)
          ? { ...item, state: "pending", message: undefined, dpsNumber: undefined, serviceInvoiceId: undefined }
          : item,
      ),
    );

    startTransition(async () => {
      await runEmissionForIds(failedIds, setItems);
      router.refresh();
    });
  }, [items, router]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    items,
    running: isPending,
    startEmission,
    retryFailed,
    close,
  };
}
