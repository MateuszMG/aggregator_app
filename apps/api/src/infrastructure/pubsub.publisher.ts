import { PubSub } from '@google-cloud/pubsub';
import { PUBSUB_TOPICS, ReportFilters } from 'shared';
import { pubsubMessagesPublished } from '../metrics';

export class PubSubPublisher {
  constructor(private readonly pubsub: PubSub) {}

  async publishGenerateReport(filters: ReportFilters): Promise<void> {
    const [topic] = await this.pubsub.topic(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS).get({ autoCreate: true });
    await topic.publishMessage({ json: filters });
    pubsubMessagesPublished.inc({ topic: PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS });
  }
}
