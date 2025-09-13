import { ReportFilters } from 'shared';
import { PubSubPublisher } from '../infrastructure/pubsub.publisher';

export class GenerateReportUseCase {
  constructor(private readonly publisher: PubSubPublisher) {}

  async execute(filters: ReportFilters): Promise<void> {
    await this.publisher.publishGenerateReport(filters);
  }
}
