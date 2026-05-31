import type { IUser, ITask } from "./interfaces";
import { MOCK_ASSIGNMENTS } from "./mockdata";

/**
 * Role model (matches the backend):
 *   ADMIN         - full access: manage users, change roles, all tasks
 *   GROUP_LEADER  - create/assign/manage tasks, manage task status
 *   MEMBER        - view tasks, update status of own assigned tasks, comment
 */

export const isAdmin = (user: IUser | null): boolean => user?.role === "ADMIN";

export const isLeader = (user: IUser | null): boolean => user?.role === "GROUP_LEADER";

export const isMember = (user: IUser | null): boolean => user?.role === "MEMBER";

/** ADMIN and GROUP_LEADER may manage tasks. */
export const isManager = (user: IUser | null): boolean =>
  isAdmin(user) || isLeader(user);

/** Kept for backward compatibility with existing pages (MEMBER == old "employee"). */
export const isEmployee = (user: IUser | null): boolean => isMember(user);

export const canCreateTask = (user: IUser | null): boolean => isManager(user);

export const canEditTask = (user: IUser | null, _task: ITask): boolean => isManager(user);

export const canDeleteTask = (user: IUser | null): boolean => isManager(user);

export const canViewTask = (user: IUser | null): boolean => user !== null;

export const canUpdateTaskStatus = (user: IUser | null, task: ITask): boolean => {
  if (!user) return false;
  if (isManager(user)) return true;

  // Members can only update status of tasks assigned to them.
  if (task.assignee_ids && task.assignee_ids.length > 0) {
    return task.assignee_ids.includes(user.user_id);
  }
  const taskAssignments = MOCK_ASSIGNMENTS.filter((a) => a.task_id === task.task_id);
  return taskAssignments.some((a) => a.user_id === user.user_id);
};

export const canAddComment = (user: IUser | null): boolean => user !== null;

export const canAssignEmployees = (user: IUser | null): boolean => isManager(user);

/** Viewing the team is allowed for managers; changing roles is ADMIN-only. */
export const canManageTeam = (user: IUser | null): boolean => isManager(user);

export const canChangeRoles = (user: IUser | null): boolean => isAdmin(user);

export const canManageUsers = (user: IUser | null): boolean => isAdmin(user);

export const isAssignedToTask = (user: IUser | null, task: ITask): boolean => {
  if (!user) return false;
  if (task.assignee_ids && task.assignee_ids.length > 0) {
    return task.assignee_ids.includes(user.user_id);
  }
  return MOCK_ASSIGNMENTS.some(
    (a) => a.task_id === task.task_id && a.user_id === user.user_id
  );
};
