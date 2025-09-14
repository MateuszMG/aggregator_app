import { describe, it, expect } from 'vitest';
import { getSubscriptionName, PUBSUB_TOPICS } from './pubsub';

describe('pubsub utilities', () => {
  it('creates subscription name for topic', () => {
    expect(getSubscriptionName(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS)).toBe('generate-report-requests-sub');
  });
});
