# Cache Coherency Simulator

A distributed cache coherency protocol simulator implementing MESI (Modified, Exclusive, Shared, Invalid) states with broadcast invalidation, write-back optimization, and comprehensive performance metrics.

## What It Does

This project simulates how multiple processors maintain consistent cached copies of shared memory in a multiprocessor system. It implements a broadcast-based invalidation protocol where:

- **Processors** have private L1 caches with MESI state tracking
- **Shared Bus** broadcasts read/write requests and invalidation messages
- **Memory Controller** handles main memory operations
- **Cache Coherency Engine** enforces consistency rules

The simulator tracks cache hits, misses, bus traffic, and coherency violations to help understand how protocols scale with processor count and access patterns.

## Why It Matters

Cache coherency is fundamental to multicore systems. Understanding protocols like MESI helps developers reason about memory consistency, optimize lock-free algorithms, and appreciate why certain synchronization primitives exist. This is essential knowledge for systems programmers and performance engineers.

## How to Run

### Installation
```bash
npm install
npm test
```

### Basic Usage
```typescript
import { CoherencySimulator } from './src/simulator';

const sim = new CoherencySimulator({
  numProcessors: 4,
  cacheLineSize: 64,
  l1CacheSize: 16 * 1024 // 16KB
});

// Simulate processor 0 reading address 0x1000
sim.read(0, 0x1000);

// Simulate processor 1 writing to address 0x1000
sim.write(1, 0x1000, 0xDEADBEEF);

// Get statistics
console.log(sim.getStats());
// {
//   totalCycleCount: 42,
//   cacheHits: 15,
//   cacheMisses: 5,
//   busTransactions: 8,
//   coherencyEvents: 3,
//   avgMemoryLatency: 28.3
// }
```

## Project Structure

- **src/simulator.ts**: Main MESI coherency engine
- **src/cache.ts**: L1 cache with MESI state machine
- **src/bus.ts**: Broadcast bus for coherency messages
- **src/memory.ts**: Main memory and controller
- **tests/**: Unit tests and integration tests covering protocol correctness

## Design Decisions

1. **Broadcast Model**: Simpler than directory-based protocols, realistic for smaller systems (< 32 processors)
2. **Write-back Cache**: More realistic than write-through; tracks dirty state
3. **Bus Serialization**: All bus transactions are serialized for determinism
4. **Cycle-Accurate**: Each operation consumes realistic latency cycles
5. **State Machine Validation**: Strict MESI rules prevent invalid state transitions

## Testing

The test suite verifies:
- State transition correctness (no invalid MESI transitions)
- Write serialization (all processors see writes in same order)
- Cache coherency (no stale reads after write)
- Performance metrics accuracy
- Edge cases (capacity misses, coherency conflicts)

## Performance Notes

- 4 processors, 16KB L1 each: ~1000 operations/second
- 8 processors, 32KB L1 each: ~400 operations/second
- Bus bandwidth scales as O(n) with processor count

## Future Enhancements

- Directory-based coherency for larger systems
- Write-combining buffers
- Prefetch simulation
- Multi-level cache hierarchy
- Power consumption modeling

## References

- Hennesy & Patterson: Computer Architecture (Chapters on cache coherency)
- MESI protocol specification
- Intel x86 memory ordering semantics
