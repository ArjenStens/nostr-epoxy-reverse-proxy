import { NRelay1, NPool, NStore, NCache, NostrFilter, NostrEvent } from "@nostrify/nostrify";
import { injectable } from "tsyringe";

import logger from "./logger.js";
import { NOSTR_RELAYS } from "./env.js";

export interface IRelayProvider {
  getDefaultPool(): NStore;
  getEvent(filter: NostrFilter, store?: NStore): Promise<NostrEvent | undefined>;
  cache: NStore;
}

@injectable()
export class RelayProvider implements IRelayProvider {
  private log = logger.extend(RelayProvider.name);
  private pool: NStore;

  cache: NStore;

  constructor() {
    const relays = NOSTR_RELAYS;

    this.pool = new NPool({
      open(url) {
        return new NRelay1(url);
      },
      // deno-lint-ignore require-await
      reqRouter: async (filters) => {
        return new Map(
          relays.map((relay) => {
            return [relay, filters];
          }),
        );
      },
      // deno-lint-ignore require-await
      eventRouter: async (_event) => {
        return relays;
      },
    });

    this.cache = new NCache({ max: 1000 });
  }

  /** Returns a single event from the cache or the relay pool */
  async getEvent(filter: NostrFilter): Promise<NostrEvent | undefined> {
    const cached = await this.cache.query([filter]);
    if (cached[0]) return cached[0];

    const events = await this.pool.query([filter]);
    return events[0];
  }

  getDefaultPool(): NStore {
    return this.pool;
  }
}
