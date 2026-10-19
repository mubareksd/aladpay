export type CompanyRole = "owner" | "admin" | "employee";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthCompany = {
  id: string;
  name: string;
  slug: string;
  role: CompanyRole;
};

export type SessionPayload = {
  user: AuthUser;
  companies: AuthCompany[];
  activeCompany: AuthCompany | null;
};
