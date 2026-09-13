// Input schemas for the `notification` and `staffNotification` command
// catalogues (03-routes-and-contracts.md §4 "notification (T-405)").
import { z } from 'zod';

export const ListNotificationsInput = z.object({ cursor: z.string().optional() }).strict();

export const MarkNotificationsReadInput = z.union([
  z.object({ ids: z.array(z.string().min(1)).min(1) }).strict(),
  z.object({ all: z.literal(true) }).strict(),
]);

export const NotificationUnreadCountInput = z.object({}).strict();

// TODO(T-405): the worker-internal `notification.deliver` job payload shape
// (event name + ids, per 03-routes-and-contracts.md §5) is owned by that task.
export const NotificationDeliverJobInput = z.unknown();

export const StaffNotificationListInput = z
  .object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
    unackedOnly: z.boolean().optional(),
  })
  .strict();

export const StaffNotificationAckInput = z.object({ id: z.string().min(1) }).strict();

export const notificationSchemas = {
  ListNotificationsInput,
  MarkNotificationsReadInput,
  NotificationUnreadCountInput,
  NotificationDeliverJobInput,
  StaffNotificationListInput,
  StaffNotificationAckInput,
};
