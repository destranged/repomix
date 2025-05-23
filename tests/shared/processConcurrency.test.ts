import os from 'node:os';
import { Piscina } from 'piscina';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProcessConcurrency, getWorkerThreadCount, initPiscina } from '../../src/shared/processConcurrency.js';

vi.mock('node:os');
vi.mock('piscina');

describe('processConcurrency', () => {
  describe('getProcessConcurrency', () => {
    it('should use os.availableParallelism when available', () => {
      const mockAvailableParallelism = vi.fn().mockReturnValue(4);
      vi.mocked(os).availableParallelism = mockAvailableParallelism;

      const result = getProcessConcurrency();

      expect(result).toBe(4);
      expect(mockAvailableParallelism).toHaveBeenCalled();
    });
  });

  describe('getWorkerThreadCount', () => {
    beforeEach(() => {
      vi.mocked(os).availableParallelism = vi.fn().mockReturnValue(8);
    });

    it('should return minimum 1 thread', () => {
      const { minThreads, maxThreads } = getWorkerThreadCount(1);

      expect(minThreads).toBe(1);
      expect(maxThreads).toBe(1);
    });

    it('should limit max threads based on number of tasks', () => {
      const { minThreads, maxThreads } = getWorkerThreadCount(1000);

      expect(minThreads).toBe(1);
      expect(maxThreads).toBe(8); // Limited by CPU count
    });

    it('should scale max threads based on task count', () => {
      const { maxThreads: maxThreads1 } = getWorkerThreadCount(200);
      const { maxThreads: maxThreads2 } = getWorkerThreadCount(400);

      expect(maxThreads2).toBeGreaterThan(maxThreads1);
    });

    it('should handle large numbers of tasks', () => {
      const { minThreads, maxThreads } = getWorkerThreadCount(10000);

      expect(minThreads).toBe(1);
      expect(maxThreads).toBe(8); // Limited by CPU count
    });

    it('should handle zero tasks', () => {
      const { minThreads, maxThreads } = getWorkerThreadCount(0);

      expect(minThreads).toBe(1);
      expect(maxThreads).toBe(1);
    });
  });

  describe('initPiscina', () => {
    beforeEach(() => {
      vi.mocked(os).availableParallelism = vi.fn().mockReturnValue(4);
      vi.mocked(Piscina).mockImplementation(() => ({}) as Piscina);
    });

    it('should initialize Piscina with correct configuration', () => {
      const workerPath = '/path/to/worker.js';
      const piscina = initPiscina(500, workerPath);

      expect(Piscina).toHaveBeenCalledWith({
        filename: workerPath,
        minThreads: 1,
        maxThreads: 4,
        idleTimeout: 5000,
        env: expect.objectContaining({
          ...process.env,
          REPOMIX_LOGLEVEL: '2',
        }),
      });
      expect(piscina).toBeDefined();
    });
  });
});
