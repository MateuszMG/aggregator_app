import { Pool } from 'pg';
import { addMonths, formatISO, startOfMonth } from 'date-fns';

export interface MechanicPerformance {
  totalOrders: number;
  averageHoursPerOrder: number;
  servicesBreakdown: Record<string, number>;
}

export interface OrderAggregates {
  mechanicPerformance: Record<string, MechanicPerformance>;
  weeklyThroughput: Record<string, number>;
}

export const fetchOrders = async (pool: Pool, year: number, month: number): Promise<OrderAggregates> => {
  const startDate = startOfMonth(new Date(Date.UTC(year, month - 1, 1)));
  const endDate = addMonths(startDate, 1);

  const mechanicQuery = `
    WITH ms AS (
      SELECT so.mechanic_id,
             sd.service_name,
             COUNT(*)::int AS service_count,
             SUM(so.hours_spent)::float AS service_hours
      FROM service_orders so
      JOIN service_definitions sd ON so.service_id = sd.service_id
      WHERE so.date_finished >= $1 AND so.date_finished < $2
      GROUP BY so.mechanic_id, sd.service_name
    ),
    m AS (
      SELECT mechanic_id,
             SUM(service_count) AS total_orders,
             SUM(service_hours) AS total_hours,
             jsonb_object_agg(service_name, service_count) AS services_breakdown
      FROM ms
      GROUP BY mechanic_id
    )
    SELECT jsonb_object_agg(
             mechanic_id,
             jsonb_build_object(
               'totalOrders', total_orders,
               'averageHoursPerOrder', CASE WHEN total_orders = 0 THEN 0 ELSE total_hours / total_orders END,
               'servicesBreakdown', services_breakdown
             )
           ) AS mechanic_performance
    FROM m`;

  const { rows: mechanicRows } = await pool.query(mechanicQuery, [formatISO(startDate), formatISO(endDate)]);
  const mechanicPerformance: Record<string, MechanicPerformance> = mechanicRows[0]?.mechanic_performance ?? {};

  const weeklyQuery = `
    SELECT jsonb_object_agg(week, orders) AS weekly_throughput
    FROM (
      SELECT to_char(date_finished, 'IYYY-IW') AS week,
             COUNT(*)::int AS orders
      FROM service_orders
      WHERE date_finished >= $1 AND date_finished < $2
      GROUP BY week
    ) w`;

  const { rows: weeklyRows } = await pool.query(weeklyQuery, [formatISO(startDate), formatISO(endDate)]);
  const weeklyThroughput: Record<string, number> = weeklyRows[0]?.weekly_throughput ?? {};

  return { mechanicPerformance, weeklyThroughput };
};
