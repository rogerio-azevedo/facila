import Link from "next/link";

import { ContractsTable } from "@/components/contracts/contracts-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClientContractsSectionProps = {
  clientId: string;
  contracts: Array<{
    id: string;
    clientId: string;
    name: string;
    amount: string;
    status: "active" | "inactive" | "suspended";
    dueDay: number;
    startDate: Date;
    endDate: Date | null;
  }>;
};

export function ClientContractsSection({ clientId, contracts }: ClientContractsSectionProps) {
  const rows = contracts.map((contract) => ({
    ...contract,
    clientName: undefined,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Contratos</CardTitle>
        <Button asChild size="sm">
          <Link href={`/contracts/new?clientId=${clientId}`}>Novo contrato</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <ContractsTable rows={rows} />
      </CardContent>
    </Card>
  );
}
