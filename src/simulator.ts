export type MESIState = 'modified' | 'exclusive' | 'shared' | 'invalid';

export interface CacheLine {
  address: number;
  data: number;
  state: MESIState;
  owner: number;
}

export interface SimulatorConfig {
  numProcessors: number;
  cacheLineSize: number;
  l1CacheSize: number;
}

export interface SimulatorStats {
  totalCycleCount: number;
  cacheHits: number;
  cacheMisses: number;
  busTransactions: number;
  coherencyEvents: number;
  avgMemoryLatency: number;
}

export class Cache {
  private lines: Map<number, CacheLine> = new Map();
  private maxLines: number;
  private hits: number = 0;
  private misses: number = 0;
  private processorId: number;

  constructor(processorId: number, cacheSize: number, lineSize: number) {
    this.processorId = processorId;
    this.maxLines = Math.floor(cacheSize / lineSize);
  }

  read(address: number): { hit: boolean; data?: number } {
    const line = this.lines.get(address);
    if (line && line.state !== 'invalid') {
      this.hits++;
      return { hit: true, data: line.data };
    }
    this.misses++;
    return { hit: false };
  }

  write(address: number, data: number): { hit: boolean; oldState?: MESIState } {
    const line = this.lines.get(address);
    if (line && line.state !== 'invalid') {
      const oldState = line.state;
      line.data = data;
      line.state = 'modified';
      this.hits++;
      return { hit: true, oldState };
    }
    this.misses++;
    return { hit: false };
  }

  allocate(address: number, data: number, state: MESIState = 'exclusive'): void {
    if (this.lines.size >= this.maxLines) {
      this.evict();
    }
    this.lines.set(address, {
      address,
      data,
      state,
      owner: this.processorId
    });
  }

  setState(address: number, state: MESIState): void {
    const line = this.lines.get(address);
    if (line) {
      line.state = state;
    }
  }

  invalidate(address: number): boolean {
    const line = this.lines.get(address);
    if (line) {
      line.state = 'invalid';
      return true;
    }
    return false;
  }

  private evict(): void {
    const firstKey = this.lines.keys().next().value;
    this.lines.delete(firstKey);
  }

  getStats() {
    return { hits: this.hits, misses: this.misses };
  }
}

export class CoherencySimulator {
  private caches: Cache[];
  private memory: Map<number, number> = new Map();
  private cycleCount: number = 0;
  private busTransactions: number = 0;
  private coherencyEvents: number = 0;
  private config: SimulatorConfig;

  constructor(config: SimulatorConfig) {
    this.config = config;
    this.caches = Array.from(
      { length: config.numProcessors },
      (_, i) => new Cache(i, config.l1CacheSize, config.cacheLineSize)
    );
  }

  read(processorId: number, address: number): number {
    const cache = this.caches[processorId];
    const result = cache.read(address);

    if (result.hit) {
      this.cycleCount += 4; // Cache hit latency
      return result.data!;
    }

    // Cache miss: fetch from memory via bus
    this.cycleCount += 20; // Bus latency
    this.busTransactions++;

    const data = this.memory.get(address) ?? 0;
    cache.allocate(address, data, 'exclusive');

    return data;
  }

  write(processorId: number, address: number, data: number): void {
    const cache = this.caches[processorId];
    const result = cache.write(address, data);

    if (result.hit) {
      this.cycleCount += 4;
      // Broadcast invalidation to other caches
      this.invalidateOthers(address, processorId);
      this.coherencyEvents++;
      return;
    }

    // Write miss: allocate line in modified state
    this.cycleCount += 20;
    this.busTransactions++;
    cache.allocate(address, data, 'modified');
    this.invalidateOthers(address, processorId);
    this.coherencyEvents++;
  }

  private invalidateOthers(address: number, exceptProcessor: number): void {
    for (let i = 0; i < this.config.numProcessors; i++) {
      if (i !== exceptProcessor) {
        this.caches[i].invalidate(address);
      }
    }
  }

  getStats(): SimulatorStats {
    let totalHits = 0, totalMisses = 0;
    this.caches.forEach(cache => {
      const stats = cache.getStats();
      totalHits += stats.hits;
      totalMisses += stats.misses;
    });
    const avgLatency =
      totalHits > 0 ? (this.cycleCount / (totalHits + totalMisses)) : 0;
    return {
      totalCycleCount: this.cycleCount,
      cacheHits: totalHits,
      cacheMisses: totalMisses,
      busTransactions: this.busTransactions,
      coherencyEvents: this.coherencyEvents,
      avgMemoryLatency: parseFloat(avgLatency.toFixed(2))
    };
  }
}
