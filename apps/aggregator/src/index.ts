import { PubSub } from '@google-cloud/pubsub';
import { Datastore } from '@google-cloud/datastore';
import { Pool } from 'pg';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { buildReportId, monthlyReportSchema, reportFiltersSchema, PUBSUB_TOPICS, getSubscriptionName } from 'shared';

const projectId = process.env.GCLOUD_PROJECT || 'local-dev';
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const pubsub = new PubSub({ projectId });
const datastore = new Datastore({ projectId });
interface MechanicPerformanceInternal {
  totalOrders: number;
  totalHours: number;
  servicesBreakdown: Record<string, number>;
}

async function generateReport(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const { rows } = await pool.query(
    `SELECT so.mechanic_id, so.hours_spent, sd.service_name, so.date_finished
     FROM service_orders so
     JOIN service_definitions sd ON so.service_id = sd.service_id
     WHERE so.date_finished >= $1 AND so.date_finished < $2`,
    [startDate.toISOString(), endDate.toISOString()],
  );

  const mechanics: Record<string, MechanicPerformanceInternal> = {};
  const weeklyThroughput: Record<string, number> = {};

  for (const row of rows) {
    const mechanicId: string = row.mechanic_id;
    const hours = Number(row.hours_spent);
    const serviceName: string = row.service_name;
    const finishedDate = new Date(row.date_finished);

    if (!mechanics[mechanicId]) {
      mechanics[mechanicId] = {
        totalOrders: 0,
        totalHours: 0,
        servicesBreakdown: {},
      };
    }
    const mp = mechanics[mechanicId];
    mp.totalOrders += 1;
    mp.totalHours += hours;
    mp.servicesBreakdown[serviceName] = (mp.servicesBreakdown[serviceName] || 0) + 1;

    const weekKey = `${getISOWeekYear(finishedDate)}-${String(getISOWeek(finishedDate)).padStart(2, '0')}`;
    weeklyThroughput[weekKey] = (weeklyThroughput[weekKey] || 0) + 1;
  }

  const mechanicPerformance: Record<
    string,
    { totalOrders: number; averageHoursPerOrder: number; servicesBreakdown: Record<string, number> }
  > = {};

  for (const [id, data] of Object.entries(mechanics)) {
    mechanicPerformance[id] = {
      totalOrders: data.totalOrders,
      averageHoursPerOrder: data.totalOrders ? data.totalHours / data.totalOrders : 0,
      servicesBreakdown: data.servicesBreakdown,
    };
  }

  const report = monthlyReportSchema.parse({
    year,
    month,
    mechanicPerformance,
    weeklyThroughput,
  });

  const key = datastore.key(['MonthlyReport', buildReportId({ year, month })]);
  await datastore.save({ key, data: report });
}

async function main() {
  const topicName = PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS;
  const subscriptionName = getSubscriptionName(topicName);
  const [topic] = await pubsub.topic(topicName).get({ autoCreate: true });
  const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });

  subscription.on('message', async (message) => {
    try {
      const payload = JSON.parse(message.data.toString());
      const { year, month } = reportFiltersSchema.parse(payload);
      await generateReport(year, month);
      message.ack();
      console.log(`Report for ${year}-${month} generated`);
    } catch (err) {
      console.error('Failed to process message', err);
      message.nack();
    }
  });

  console.log('Aggregator service listening for messages...');
}

main().catch((err) => {
  console.error('Failed to start aggregator', err);
  process.exit(1);
});
