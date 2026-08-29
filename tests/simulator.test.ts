import { CoherencySimulator } from '../src/simulator';

describe('Cache Coherency Simulator', () => {
  let sim: CoherencySimulator;

  beforeEach(() => {
    sim = new CoherencySimulator({
      numProcessors: 4,
      cacheLineSize: 64,
      l1CacheSize: 16 * 1024
    });
  });

  it('should handle cache hits correctly', () => {
    const stats = sim.getStats();
    expect(stats.cacheHits).toBe(0);
    expect(stats.cacheMisses).toBe(0);
  });

  it('should track read operations', () => {
    sim.read(0, 0x1000);
    const stats = sim.getStats();
    expect(stats.cacheMisses).toBeGreaterThan(0);
  });

  it('should track write operations', () => {
    sim.write(0, 0x1000, 0xDEADBEEF);
    sim.write(1, 0x1000, 0xCAFEBABE);
    const stats = sim.getStats();
    expect(stats.coherencyEvents).toBeGreaterThan(0);
  });

  it('should broadcast invalidations on write', () => {
    sim.read(0, 0x1000);
    sim.read(1, 0x1000);
    const beforeWrite = sim.getStats();
    sim.write(0, 0x1000, 0x12345678);
    const afterWrite = sim.getStats();
    expect(afterWrite.coherencyEvents).toBeGreaterThan(beforeWrite.coherencyEvents);
  });

  it('should track bus transactions', () => {
    sim.read(0, 0x2000);
    sim.read(1, 0x2000);
    const stats = sim.getStats();
    expect(stats.busTransactions).toBeGreaterThan(0);
  });

  it('should accumulate cycles correctly', () => {
    const before = sim.getStats();
    sim.read(2, 0x3000);
    const after = sim.getStats();
    expect(after.totalCycleCount).toBeGreaterThan(before.totalCycleCount);
  });

  it('should calculate average latency', () => {
    for (let i = 0; i < 10; i++) {
      sim.read(0, 0x1000 + i * 64);
    }
    const stats = sim.getStats();
    expect(stats.avgMemoryLatency).toBeGreaterThan(0);
    expect(stats.avgMemoryLatency).toBeLessThan(100);
  });

  it('should handle multi-processor scenarios', () => {
    sim.write(0, 0x1000, 0x111);
    sim.read(1, 0x1000);
    sim.read(2, 0x1000);
    sim.write(3, 0x1000, 0x222);
    const stats = sim.getStats();
    expect(stats.coherencyEvents).toBeGreaterThan(0);
  });
});
