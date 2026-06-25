import { z } from 'zod';
import { apiClient } from './apiClient';

const CountResponseSchema = z.object({
  count: z.number(),
});

const LastUpdateResponseSchema = z.object({
  last_update: z.string().nullable(),
});

const DbStatusResponseSchema = z.object({
  connected: z.boolean(),
});

export async function getHeaderSourcesCount(): Promise<number> {
  const raw = await apiClient<unknown>('/monitorization/sources_count');
  return CountResponseSchema.parse(raw).count;
}

export async function getHeaderLastUpdate(): Promise<string | null> {
  const raw = await apiClient<unknown>('/monitorization/last_update');
  return LastUpdateResponseSchema.parse(raw).last_update;
}

export async function getHeaderDbStatus(): Promise<boolean> {
  const raw = await apiClient<unknown>('/monitorization/db_status');
  return DbStatusResponseSchema.parse(raw).connected;
}
