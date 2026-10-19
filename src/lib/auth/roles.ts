import type { CompanyRole } from "@/lib/auth/types";

export function canManageMembers(role: CompanyRole): boolean {
  return role === "owner" || role === "admin";
}

export function canPublishPos(role: CompanyRole): boolean {
  return role === "owner" || role === "admin" || role === "employee";
}

export function canRemoveMember(actorRole: CompanyRole, targetRole: CompanyRole): boolean {
  if (targetRole === "owner") return false;
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return targetRole === "employee";
  return false;
}
