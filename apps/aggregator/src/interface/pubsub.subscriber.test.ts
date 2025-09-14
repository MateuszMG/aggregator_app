import { describe, it, expect, vi } from 'vitest';
import { startSubscriber } from './pubsub.subscriber';
import { PUBSUB_TOPICS, getSubscriptionName } from 'shared';

describe('startSubscriber', () => {
  const setup = () => {
    let handler: ((msg: any) => Promise<void>) | undefined;
    const subscription = {
      on: vi.fn((event: string, cb: any) => {
        if (event === 'message') handler = cb;
      }),
    };
    const topic: any = {};
    topic.get = vi.fn().mockResolvedValue([topic]);
    topic.subscription = vi.fn(() => ({ get: vi.fn().mockResolvedValue([subscription]) }));
    const pubsub = { topic: vi.fn(() => topic) } as any;
    const useCase = { execute: vi.fn() } as any;
    return { pubsub, topic, useCase, getHandler: () => handler! };
  };

  it('acknowledges valid messages', async () => {
    const { pubsub, topic, useCase, getHandler } = setup();
    await startSubscriber(pubsub, useCase);
    expect(pubsub.topic).toHaveBeenCalledWith(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS);
    expect(topic.subscription).toHaveBeenCalledWith(getSubscriptionName(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS));
    const message = {
      data: Buffer.from(JSON.stringify({ year: 2024, month: 5 })),
      ack: vi.fn(),
      nack: vi.fn(),
    } as any;
    await getHandler()(message);
    expect(useCase.execute).toHaveBeenCalledWith(2024, 5);
    expect(message.ack).toHaveBeenCalled();
    expect(message.nack).not.toHaveBeenCalled();
  });

  it('nacks invalid messages', async () => {
    const { pubsub, topic, useCase, getHandler } = setup();
    await startSubscriber(pubsub, useCase);
    expect(pubsub.topic).toHaveBeenCalledWith(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS);
    expect(topic.subscription).toHaveBeenCalledWith(getSubscriptionName(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS));
    const message = {
      data: Buffer.from(JSON.stringify({ year: 2024 })),
      ack: vi.fn(),
      nack: vi.fn(),
    } as any;
    await getHandler()(message);
    expect(useCase.execute).not.toHaveBeenCalled();
    expect(message.ack).not.toHaveBeenCalled();
    expect(message.nack).toHaveBeenCalled();
  });

  it('nacks when use case execution fails', async () => {
    const { pubsub, topic, useCase, getHandler } = setup();
    useCase.execute.mockRejectedValueOnce(new Error('fail'));
    await startSubscriber(pubsub, useCase);
    expect(pubsub.topic).toHaveBeenCalledWith(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS);
    expect(topic.subscription).toHaveBeenCalledWith(getSubscriptionName(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS));
    const message = {
      data: Buffer.from(JSON.stringify({ year: 2024, month: 5 })),
      ack: vi.fn(),
      nack: vi.fn(),
    } as any;
    await getHandler()(message);
    expect(useCase.execute).toHaveBeenCalledWith(2024, 5);
    expect(message.ack).not.toHaveBeenCalled();
    expect(message.nack).toHaveBeenCalled();
  });
});
