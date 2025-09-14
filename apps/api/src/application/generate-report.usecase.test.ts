import { describe, it, expect, vi } from 'vitest';
import { GenerateReportUseCase } from './generate-report.usecase';

describe('GenerateReportUseCase (API)', () => {
  it('publishes generate report request', async () => {
    const publisher = { publishGenerateReport: vi.fn().mockResolvedValue(undefined) } as any;
    const usecase = new GenerateReportUseCase(publisher);
    await usecase.execute({ year: 2024, month: 5 });
    expect(publisher.publishGenerateReport).toHaveBeenCalledWith({ year: 2024, month: 5 });
  });

  it('propagates publisher errors', async () => {
    const error = new Error('publish fail');
    const publisher = { publishGenerateReport: vi.fn().mockRejectedValue(error) } as any;
    const usecase = new GenerateReportUseCase(publisher);
    await expect(usecase.execute({ year: 2024, month: 5 })).rejects.toThrow(error);
  });
});
