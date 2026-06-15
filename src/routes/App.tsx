import { Navigate, Route, Routes } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { AdminShell } from "@/routes/AdminShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { OrdersPage } from "@/features/orders/OrdersPage";
import { RequestsPage } from "@/features/requests/RequestsPage";

const ProtectedRoutes = () => {
  const token = useAppSelector((state) => state.auth.token);

  if (!token) {
    return <Navigate replace to="/login" />;
  }

  return <AdminShell />;
};

export const App = () => (
  <Routes>
    <Route element={<LoginPage />} path="/login" />
    <Route element={<ProtectedRoutes />}>
      <Route element={<Navigate replace to="/solicitudes" />} path="/" />
      <Route element={<RequestsPage />} path="/solicitudes" />
      <Route element={<OrdersPage />} path="/ordenes" />
    </Route>
    <Route element={<Navigate replace to="/" />} path="*" />
  </Routes>
);
