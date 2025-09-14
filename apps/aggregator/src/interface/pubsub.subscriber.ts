import { PubSub, type Subscription } from '@google-cloud/pubsub';
import { getSubscriptionName, PUBSUB_TOPICS, reportFiltersSchema } from 'shared';
import { GenerateReportUseCase } from '../application/generate-report.usecase';
import { logger } from 'shared';
import { pubsubMessagesProcessed } from '../metrics';

export const startSubscriber = async (pubsub: PubSub, useCase: GenerateReportUseCase): Promise<Subscription> => {
  const topicName = PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS;
  const subscriptionName = getSubscriptionName(topicName);
  const [topic] = await pubsub.topic(topicName).get({ autoCreate: true });
  const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });

  subscription.on('message', async (message) => {
    try {
      const payload = JSON.parse(message.data.toString());
      const { year, month } = reportFiltersSchema.parse(payload);
      await useCase.execute(year, month);
      pubsubMessagesProcessed.inc();
      message.ack();
      logger.info(`Report for ${year}-${month} generated`);
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to process message');
      message.nack();
    }
  });

  logger.info('Aggregator service listening for messages...');
  return subscription;
};
