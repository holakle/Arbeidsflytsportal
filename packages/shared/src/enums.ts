export const roleCodes = ['system_admin', 'org_admin', 'planner', 'technician', 'member'] as const;
export const workOrderStatuses = ['OPEN', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED'] as const;
export const todoStatuses = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export const activityTypes = ['INSTALLATION', 'TRAVEL', 'MEETING', 'ADMIN', 'OTHER'] as const;
export const widgetTypes = ['MY_WORKORDERS', 'BOOKINGS', 'HOURS_THIS_WEEK', 'TODO'] as const;

export type RoleCode = (typeof roleCodes)[number];
export type WorkOrderStatus = (typeof workOrderStatuses)[number];
export type TodoStatus = (typeof todoStatuses)[number];
export type ActivityType = (typeof activityTypes)[number];
export type WidgetType = (typeof widgetTypes)[number];

