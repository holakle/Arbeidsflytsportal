export const roleCodes = ['system_admin', 'org_admin', 'planner', 'technician', 'member'] as const;
export const workOrderStatuses = [
  'DRAFT',
  'READY_FOR_PLANNING',
  'PLANNED',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
] as const;
export const todoStatuses = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export const activityTypes = ['INSTALLATION', 'TRAVEL', 'MEETING', 'ADMIN', 'OTHER'] as const;
export const workSessionStates = ['RUNNING', 'PAUSED', 'DONE'] as const;
export const attachmentKinds = ['BEFORE', 'AFTER', 'GENERAL', 'DEVIATION', 'SIGNATURE'] as const;
export const timesheetStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED'] as const;
export const notificationTypes = [
  'WORKORDER_ASSIGNED',
  'SCHEDULE_CHANGED',
  'WORKORDER_BLOCKED',
  'WORKORDER_DONE',
] as const;
export const widgetTypes = [
  'MY_WORKORDERS',
  'BOOKINGS',
  'HOURS_THIS_WEEK',
  'TODO',
  'MY_CALENDAR',
] as const;
export const equipmentItemTypes = ['EQUIPMENT', 'CONSUMABLE'] as const;

export type RoleCode = (typeof roleCodes)[number];
export type WorkOrderStatus = (typeof workOrderStatuses)[number];
export type TodoStatus = (typeof todoStatuses)[number];
export type ActivityType = (typeof activityTypes)[number];
export type WidgetType = (typeof widgetTypes)[number];
export type EquipmentItemType = (typeof equipmentItemTypes)[number];
export type WorkSessionState = (typeof workSessionStates)[number];
export type AttachmentKind = (typeof attachmentKinds)[number];
export type TimesheetStatus = (typeof timesheetStatuses)[number];
export type NotificationType = (typeof notificationTypes)[number];
