import { Navigate, Route, Routes } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { AdminShell } from "@/routes/AdminShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { AgentsPage } from "@/features/agents/AgentsPage";
import { AgentMonitorPage } from "@/features/monitor/AgentMonitorPage";
import { OrderTrackingPage } from "@/features/orders/OrderTrackingPage";
import { OrdersPage } from "@/features/orders/OrdersPage";
import { RequestsPage } from "@/features/requests/RequestsPage";
import { adminPaths } from "@/routes/paths";

const ProtectedRoutes = () => {
  const token = useAppSelector((state) => state.auth.token);

  if (!token) {
    return <Navigate replace to={adminPaths.login} />;
  }

  return <AdminShell />;
};

export const App = () => (
  <Routes>
    <Route element={<Navigate replace to={adminPaths.root} />} path="/" />
    <Route element={<OrderTrackingPage />} path="/order/:uuid" />
    <Route element={<LoginPage />} path={adminPaths.login} />
    <Route element={<ProtectedRoutes />}>
      <Route element={<Navigate replace to={adminPaths.requests} />} path={adminPaths.root} />
      <Route element={<RequestsPage />} path={adminPaths.requests} />
      <Route element={<OrdersPage />} path={adminPaths.orders} />
      <Route element={<AgentsPage />} path={adminPaths.agents} />
      <Route element={<AgentMonitorPage />} path={adminPaths.agentMonitor} />
    </Route>
    <Route element={<Navigate replace to={adminPaths.root} />} path="*" />
  </Routes>
);
