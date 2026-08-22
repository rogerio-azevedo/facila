import Link from "next/link";

import { AccountsReceivableTable } from "@/components/accounts-receivable/accounts-receivable-table";
import type { AccountReceivableTableRow } from "@/components/accounts-receivable/accounts-receivable-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClientAccountsReceivableSectionProps = {
  clientId: string;
  receivables: AccountReceivableTableRow[];
};

export function ClientAccountsReceivableSection({
  clientId,
  receivables,
}: ClientAccountsReceivableSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Contas a receber</CardTitle>
        <Button asChild size="sm">
          <Link href={`/accounts-receivable/new?clientId=${clientId}`}>Nova conta</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <AccountsReceivableTable rows={receivables} />
      </CardContent>
    </Card>
  );
}
