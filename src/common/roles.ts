export const CLUB_ROLES = ['CLUB_ADMIN', 'SUPER_ADMIN'] as const;
export const ORGANIZER_ROLES = ['ORGANIZER', 'SUPER_ADMIN'] as const;

export type StaffRole = (typeof CLUB_ROLES)[number] | (typeof ORGANIZER_ROLES)[number];

export function isClubRole(role: string | undefined): boolean {
  return !!role && (CLUB_ROLES as readonly string[]).includes(role);
}

export function isOrganizerRole(role: string | undefined): boolean {
  return !!role && (ORGANIZER_ROLES as readonly string[]).includes(role);
}
