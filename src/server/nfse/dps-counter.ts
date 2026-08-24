import "server-only";

import type { DpsCounter, DpsCounterScope } from "open-nfse";

import { reserveNextDpsNumber } from "@/server/dal/issuers";

export class PostgresDpsCounter implements DpsCounter {
  constructor(private readonly issuerId: string) {}

  async next(_scope: DpsCounterScope): Promise<string> {
    const number = await reserveNextDpsNumber(this.issuerId);
    return String(number);
  }
}
