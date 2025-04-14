export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  url: string | null;
  status: string;
  rolesAllowed: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invite {
  id: string;
  orgId: string;
  email: string;
  role: string;
  invitedBy: string;
  createdAt: Date;
}

export interface DashboardData {
  organization: Organization;
  services: Service[];
  role: string;
}
