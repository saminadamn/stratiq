import { describe, expect, it, vi } from 'vitest';
import { MetricNotFoundError } from '../../../domain/errors/intelligence-error.js';
import type { MetricDefinitionRepository } from '../../../domain/repositories/metric-definition.repository.js';
import { MetricsRegistryService } from './metrics-registry.service.js';

function buildRepository(
  overrides: Partial<MetricDefinitionRepository> = {},
): MetricDefinitionRepository {
  return {
    upsertMany: vi.fn(),
    listAll: vi.fn().mockResolvedValue([]),
    findByKey: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('MetricsRegistryService', () => {
  it('lists every metric definition from the repository', async () => {
    const repository = buildRepository({
      listAll: vi.fn().mockResolvedValue([{ key: 'revenue', name: 'Revenue' }]),
    });
    const service = new MetricsRegistryService(repository);

    const metrics = await service.list();

    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.key).toBe('revenue');
  });

  it('returns a metric definition by key', async () => {
    const repository = buildRepository({
      findByKey: vi.fn().mockResolvedValue({ key: 'revenue', name: 'Revenue' }),
    });
    const service = new MetricsRegistryService(repository);

    const metric = await service.getByKey('revenue');

    expect(metric.name).toBe('Revenue');
  });

  it('throws MetricNotFoundError for an unknown key', async () => {
    const service = new MetricsRegistryService(buildRepository());

    await expect(service.getByKey('unknown')).rejects.toBeInstanceOf(MetricNotFoundError);
  });
});
