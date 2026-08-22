import Link from "next/link";

import { formatDocument } from "@/lib/format-document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientListItem } from "@/server/dal/clients";

type ClientsListProps = {
  clients: ClientListItem[];
};

export function ClientsList({ clients }: ClientsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes ({clients.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {clients.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
        )}
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="font-medium">{client.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDocument(client.document, client.personType)}
                {client.email ? ` · ${client.email}` : ""}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {client.personType === "individual" ? "PF" : "PJ"}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
