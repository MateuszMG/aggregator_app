import { Pool } from 'pg';
import { addMonths, formatISO, startOfMonth } from 'date-fns';

export interface OrderRecord {
  mechanic_id: string;
  hours_spent: number;
  service_name: string;
  date_finished: string | Date;
}

export const fetchOrders = async (pool: Pool, year: number, month: number): Promise<OrderRecord[]> => {
  const startDate = startOfMonth(new Date(Date.UTC(year, month - 1, 1)));
  const endDate = addMonths(startDate, 1);
  const { rows } = await pool.query(
    `SELECT so.mechanic_id, so.hours_spent, sd.service_name, so.date_finished
     FROM service_orders so
     JOIN service_definitions sd ON so.service_id = sd.service_id
     WHERE so.date_finished >= $1 AND so.date_finished < $2`,
    [formatISO(startDate), formatISO(endDate)],
  );
  return rows as OrderRecord[];
};
