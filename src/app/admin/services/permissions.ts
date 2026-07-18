/**
 * Front-end mirror of the server permission model in netlify/shared/auth.ts.
 * Keep the two in sync — the server is the source of truth and enforces these;
 * the UI copy just hides things the user can't use.
 */
export type Role = 'owner' | 'manager' | 'coordinator' | 'usher';

export type Permission =
  | 'dashboard'
  | 'attendees'
  | 'reservations'
  | 'register'
  | 'tickets'
  | 'checkin'
  | 'team'
  | 'settings';

export const ROLES: Role[] = ['owner', 'manager', 'coordinator', 'usher'];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  coordinator: 'Coordinator',
  usher: 'Usher',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: 'Full access, including managing the team.',
  manager: 'Runs the event. Everything except managing users.',
  coordinator: 'Attendees, reservations, register, tickets and check-in.',
  usher: 'Door check-in and viewing attendees.',
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'dashboard',
    'attendees',
    'reservations',
    'register',
    'tickets',
    'checkin',
    'team',
    'settings',
  ],
  manager: ['dashboard', 'attendees', 'reservations', 'register', 'tickets', 'checkin'],
  coordinator: ['attendees', 'reservations', 'register', 'tickets', 'checkin'],
  usher: ['checkin', 'attendees'],
};

export function normalizeRole(role: string | undefined | null): Role {
  if (role === 'owner' || role === 'manager' || role === 'coordinator' || role === 'usher') {
    return role;
  }
  if (role === 'admin') return 'owner'; // legacy single-role users
  return 'usher';
}

export function hasPermission(role: string | undefined | null, perm: Permission): boolean {
  return ROLE_PERMISSIONS[normalizeRole(role)].includes(perm);
}

/** Ushers may view attendees but not mutate them. */
export function canManageAttendees(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return hasPermission(r, 'attendees') && r !== 'usher';
}
