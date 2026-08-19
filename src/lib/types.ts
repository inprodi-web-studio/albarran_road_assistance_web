export type RequestStatus =
  | "pending"
  | "approved"
  | "converted"
  | "rejected"
  | "all";

export type OrderStage = "opened" | "queued" | "cancelled" | "completed" | "all";

export type ServiceType = "tire" | "battery" | "crane" | "home_service";

export type WeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type ScheduleSlot = {
  startTime: string;
  endTime: string;
};

export type ScheduleDay = {
  day: WeekDay;
  allDay: boolean;
  slots: ScheduleSlot[];
};

export type ServiceOption = {
  key: ServiceType;
  label: string;
};

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

export type AgentPhoto = {
  id?: number;
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
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
  middleName?: string;
  lastName?: string;
  phone?: string;
  photo?: AgentPhoto | null;
  firebaseUid?: string;
  email?: string;
  username?: string;
  isBusy?: boolean;
  confirmed?: boolean;
  blocked?: boolean;
  status?: AgentStatus;
  isOnShift?: boolean;
  individualScheduleActive?: boolean;
  scheduleValid?: boolean;
  workSchedule?: ScheduleDay[];
  services?: ServiceType[];
  availabilityUpdatedBy?: AdminUser | null;
  role?: AdminRole | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AgentStatus = "available" | "busy" | "blocked" | "all";

export type CreateAgentPayload = {
  name: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  email: string;
  password: string;
};

export type UpdateAgentPayload = Omit<CreateAgentPayload, "password">;

export type AgentLocation = {
  latitude: number;
  longitude: number;
  heading: number | null;
  updatedAt: string | null;
  estimatedTime: string | null;
  stale: boolean;
};

export type AgentLocationStatus = "current" | "stale" | "missing";

export type AgentMonitorOrder = {
  id: number;
  documentId?: string;
  stage: Exclude<OrderStage, "all">;
  queuePosition?: number | null;
  service?: ServiceType;
  subService?: string;
  customer?: Customer | null;
  location?: Coordinates | null;
  createdAt?: string;
};

export type AgentMonitor = Agent & {
  agentLocation?: AgentLocation | null;
  locationStatus: AgentLocationStatus;
  activeOrder?: AgentMonitorOrder | null;
  queuedOrders: AgentMonitorOrder[];
};

export type AgentMonitorResponse = {
  data: AgentMonitor[];
  meta: {
    total: number;
    refreshedAt: string;
  };
};

export type OrderEventType =
  | "assigned"
  | "queued"
  | "activated"
  | "reassigned"
  | "completed"
  | "cancelled";

export type OrderEvent = {
  id: number;
  type: OrderEventType;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
  actor?: Agent | null;
  previousAgent?: Agent | null;
  nextAgent?: Agent | null;
  createdAt?: string;
};

export type AssignmentCandidate = {
  agent: Agent;
  agentLocation?: AgentLocation | null;
  distanceMeters?: number | null;
  locationStatus: "current" | "stale" | "missing";
  activeOrderId?: number | null;
  queuedCount: number;
  globalOpen: boolean;
  agentOnShift: boolean;
  supportsService: boolean;
  eligibilityReasons: AssignmentEligibilityReason[];
  automaticallyEligible: boolean;
  manuallyAssignable: boolean;
  canAssign: boolean;
};

export type AssignmentEligibilityReason =
  | "invalid_global_schedule"
  | "outside_global_schedule"
  | "invalid_agent_schedule"
  | "outside_agent_schedule"
  | "unsupported_service"
  | "current_agent"
  | "queue_full";

export type AssignmentCandidatesResponse = {
  data: AssignmentCandidate[];
  meta: {
    maxQueuedOrders: number;
  };
};

export type ScheduleSettings = {
  timezone: string;
  schedule: ScheduleDay[];
  valid: boolean;
  error?: string | null;
  isOpen: boolean;
  nextTransitionAt?: string | null;
  services: ServiceOption[];
  updatedAt?: string | null;
  updatedBy?: AdminUser | null;
};

export type AdminOrder = {
  id: number;
  documentId?: string;
  service?: ServiceType;
  subService?: string;
  autoInfo?: string;
  stage: Exclude<OrderStage, "all">;
  queuePosition?: number | null;
  customer?: Customer | null;
  location?: Coordinates | null;
  agent?: Agent | null;
  cancelledBy?: Agent | null;
  cancelledAt?: string | null;
  cancellationComment?: string | null;
  events?: OrderEvent[];
  agentLocation?: AgentLocation | null;
  completedAt?: string | null;
  completionLocation?: Coordinates | null;
  completionDistanceMeters?: number | null;
  completionRadiusMeters?: number | null;
  completionWithinRadius?: boolean | null;
  completionConfirmedOutsideRadius?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicOrderAgent = {
  name?: string;
  lastName?: string;
  phone?: string;
  photo?: AgentPhoto | null;
};

export type PublicOrderCustomer = {
  name?: string;
};

export type PublicOrder = {
  id: number;
  documentId?: string;
  service?: ServiceType;
  subService?: string;
  autoInfo?: string;
  stage: Exclude<OrderStage, "all">;
  customer?: PublicOrderCustomer | null;
  location?: Coordinates | null;
  agent?: PublicOrderAgent | null;
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
