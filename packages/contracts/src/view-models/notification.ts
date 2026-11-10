// Replaces: `renderNotifications` (patient notifications page), app.js.
// Maps from RK.user.notifications; every item renders a `message_key` +
// `params` pair, never free text (02-data-model.md §12). The staff
// console's notification feed is `StaffNotificationsVM` in
// `view-models/staff-notifications.ts`.
//
// Release 2 (T-405): owner refines every field below against the ported
// component.
import type { NotificationKind } from '../enums';

export interface NotificationVM {
  id: string;
  kind: NotificationKind;
  messageKey: string;
  params: Record<string, string | number>;
  route: string;
  read: boolean;
  createdAt: string;
}
