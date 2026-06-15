export type RequestStatus =
  | "pending"
  | "approved"
  | "converted"
  | "rejected"
  | "all";

export type OrderStage = "opened" | "cancelled" | "completed" | "all";

export type ServiceType = "tire" | "battery" | "crane";

export type AdminRole = {
  id?: number;
  name?: string;
  type?: string;
};

export type AdminUser = {
  id: number;
  name?: string;
  lastName?: string;
  email: string;
  role?: AdminRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: AdminUser;
};

export type Customer = {
  id: number;
  name?: string;
  phone?: string;
};

export type Coordinates = {
  latitude: string | number;
  longitude: string | number;
};

export type AssistanceRequest = {
  id: number;
  documentId?: string;
  service?: ServiceType;
  subService?: string;
  autoInfo?: string;
  flowId?: string;
  isApproved: boolean | null;
  isRequested: boolean | null;
  status: Exclude<RequestStatus, "all">;
  customer?: Customer | null;
  location?: Coordinates | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Agent = {
  id: number;
  name?: string;
  lastName?: string;
  email?: string;
  isBusy?: boolean;
  blocked?: boolean;
};

export type AgentLocation = {
  latitude: number;
  longitude: number;
  heading: number;
  updatedAt: string | null;
  estimatedTime: string | null;
  stale: boolean;
};

export type AdminOrder = {
  id: number;
  documentId?: string;
  service?: ServiceType;
  subService?: string;
  autoInfo?: string;
  stage: Exclude<OrderStage, "all">;
  customer?: Customer | null;
  location?: Coordinates | null;
  agent?: Agent | null;
  agentLocation?: AgentLocation | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginationMeta = {
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};
