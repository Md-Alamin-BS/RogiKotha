// Replaces: the staff console's `renderNotifications`, admin/app.js. Maps
// from RK.moderation.notifications / `staff_notifications`
// (02-data-model.md §12); every item renders a `message_key` + `params`
// pair, never free text.
//
// TODO(T-408): owner refines every field below against the ported
// component.
import type { StaffNotificationKind } from '../enums';

export interface StaffNotificationItemVM {
  id: string;
  kind: StaffNotificationKind;
  targetCode: string;
  messageKey: string;
  params: Record<string, string | number>;
  route: string;
  acked: boolean;
  createdAt: string;
}

export interface StaffNotificationsVM {
  items: StaffNotificationItemVM[];
  nextCursor?: string;
}
