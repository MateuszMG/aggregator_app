export const PUBSUB_TOPICS = {
  GENERATE_REPORT_REQUESTS: 'generate-report-requests',
} as const;

export type PubSubTopic = (typeof PUBSUB_TOPICS)[keyof typeof PUBSUB_TOPICS];

export function getSubscriptionName(topic: PubSubTopic): string {
  return `${topic}-sub`;
}
