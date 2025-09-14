import { describe, it, expect, vi } from 'vitest';
import { PubSubPublisher } from './pubsub.publisher';

describe('PubSubPublisher', () => {
  it('publishes message to topic', async () => {
    const publishMessage = vi.fn().mockResolvedValue(undefined);
    const get = vi.fn().mockResolvedValue([{ publishMessage }]);
    const topic = vi.fn().mockReturnValue({ get });
    const pubsub = { topic } as any;
    const publisher = new PubSubPublisher(pubsub);
    await publisher.publishGenerateReport({ year: 2024, month: 5 });
    expect(topic).toHaveBeenCalledWith('generate-report-requests');
    expect(get).toHaveBeenCalledWith({ autoCreate: true });
    expect(publishMessage).toHaveBeenCalledWith({ json: { year: 2024, month: 5 } });
  });

  it('throws when publishMessage fails', async () => {
    const publishMessage = vi.fn().mockRejectedValue(new Error('boom'));
    const get = vi.fn().mockResolvedValue([{ publishMessage }]);
    const topic = vi.fn().mockReturnValue({ get });
    const pubsub = { topic } as any;
    const publisher = new PubSubPublisher(pubsub);
    await expect(publisher.publishGenerateReport({ year: 2024, month: 5 })).rejects.toThrow('boom');
    expect(topic).toHaveBeenCalledWith('generate-report-requests');
    expect(get).toHaveBeenCalledWith({ autoCreate: true });
  });
});
