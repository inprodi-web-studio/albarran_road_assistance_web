import {
  createApi,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/app/store";
import type {
  AdminOrder,
  AssistanceRequest,
  LoginPayload,
  LoginResponse,
  OrderStage,
  PaginatedResponse,
  RequestStatus,
} from "@/lib/types";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:1337/api";

const baseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

const toQuery = (params: Record<string, string | number | undefined>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );

export const getErrorMessage = (error: unknown) => {
  const apiError = error as FetchBaseQueryError | undefined;

  if (
    apiError?.data &&
    typeof apiError.data === "object" &&
    "error" in apiError.data
  ) {
    const data = apiError.data as { error?: { message?: string } };
    return data.error?.message || "No se pudo completar la accion.";
  }

  return "No se pudo completar la accion.";
};

export const api = createApi({
  reducerPath: "adminApi",
  baseQuery,
  tagTypes: ["Requests", "Request", "Orders", "Order"],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginPayload>({
      query: (body) => ({
        url: "/admin/auth/login",
        method: "POST",
        body,
      }),
    }),
    getRequests: builder.query<
      PaginatedResponse<AssistanceRequest>,
      { status: RequestStatus; page: number; pageSize: number }
    >({
      query: ({ status, page, pageSize }) => ({
        url: "/admin/requests",
        params: toQuery({ status, page, pageSize }),
      }),
      providesTags: ["Requests"],
    }),
    getRequest: builder.query<AssistanceRequest, number>({
      query: (id) => `/admin/requests/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Request", id }],
    }),
    approveRequest: builder.mutation<
      AssistanceRequest,
      { id: number; approval: boolean }
    >({
      query: ({ id, approval }) => ({
        url: `/admin/requests/${id}/approval`,
        method: "PATCH",
        body: { approval },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Requests",
        { type: "Request", id },
      ],
    }),
    getOrders: builder.query<
      PaginatedResponse<AdminOrder>,
      { stage: OrderStage; page: number; pageSize: number }
    >({
      query: ({ stage, page, pageSize }) => ({
        url: "/admin/orders",
        params: toQuery({ stage, page, pageSize }),
      }),
      providesTags: ["Orders"],
    }),
    getOrder: builder.query<AdminOrder, number>({
      query: (id) => `/admin/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Order", id }],
    }),
  }),
});

export const {
  useApproveRequestMutation,
  useGetOrderQuery,
  useGetOrdersQuery,
  useGetRequestQuery,
  useGetRequestsQuery,
  useLoginMutation,
} = api;
