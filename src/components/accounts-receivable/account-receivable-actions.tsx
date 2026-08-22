"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelAccountReceivableAction,
  markAccountReceivableAsPaidAction,
} from "@/actions/accounts-receivable";
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
import { toDateInputValue } from "@/lib/format-currency";
import {
  PAYMENT_METHOD_OPTIONS,
  type AccountReceivableFormState,
} from "@/schemas/accounts-receivable";

type AccountReceivableActionsProps = {
  accountReceivableId: string;
  status: "pending" | "paid" | "canceled";
};

export function AccountReceivableActions({
  accountReceivableId,
  status,
}: AccountReceivableActionsProps) {
  const router = useRouter();
  const [state, setState] = useState<AccountReceivableFormState>({});
  const [showPayForm, setShowPayForm] = useState(false);
  const [paymentDate, setPaymentDate] = useState(toDateInputValue(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [notes, setNotes] = useState("");
  const [isPayPending, startPayTransition] = useTransition();
  const [isCancelPending, startCancelTransition] = useTransition();

  if (status !== "pending") {
    return null;
  }

  const handlePay = () => {
    startPayTransition(async () => {
      const result = await markAccountReceivableAsPaidAction(accountReceivableId, {
        paymentDate,
        paymentMethod,
        notes,
      });

      if (!result.success) {
        setState(result);
        return;
      }

      setShowPayForm(false);
      router.refresh();
    });
  };

  const handleCancel = () => {
    if (!window.confirm("Cancelar este título?")) {
      return;
    }

    startCancelTransition(async () => {
      const result = await cancelAccountReceivableAction(accountReceivableId);

      if (!result.success) {
        setState(result);
        return;
      }

      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.errors?.form ? (
          <p className="text-sm text-destructive">{state.errors.form.join(", ")}</p>
        ) : null}

        {!showPayForm ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowPayForm(true)}>Baixar título</Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelPending}
            >
              {isCancelPending ? "Cancelando..." : "Cancelar título"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data do pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="payNotes">Observações</Label>
              <Input
                id="payNotes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="flex gap-2 md:col-span-2">
              <Button onClick={handlePay} disabled={isPayPending}>
                {isPayPending ? "Baixando..." : "Confirmar baixa"}
              </Button>
              <Button variant="outline" onClick={() => setShowPayForm(false)}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
