import { ClipboardList, LogOut, Map, MapPinned, UserRoundPlus } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/authSlice";
import { cn } from "@/lib/utils";
import { adminPaths } from "@/routes/paths";

const navigation = [
  {
    to: adminPaths.requests,
    label: "Solicitudes",
    icon: ClipboardList,
  },
  {
    to: adminPaths.orders,
    label: "Ordenes",
    icon: MapPinned,
  },
  {
    to: adminPaths.agents,
    label: "Agentes",
    icon: UserRoundPlus,
  },
  {
    to: adminPaths.agentMonitor,
    label: "Mapa",
    icon: Map,
  },
];

export const AdminShell = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const isAgentMonitor = location.pathname === adminPaths.agentMonitor;

  const onLogout = () => {
    dispatch(logout());
    navigate(adminPaths.login, { replace: true });
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <img
            alt="Albarran"
            className="h-9 w-32 shrink-0 object-contain"
            src="/albarran-logo.png"
          />
        </div>
        <nav className="grid gap-1 p-3">
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-primary/10 text-primary",
                )
              }
              key={item.to}
              to={item.to}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <img
              alt="Albarran"
              className="h-8 w-24 shrink-0 object-contain lg:hidden"
              src="/albarran-logo.png"
            />
            <div>
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                Rol {user?.role?.type || "administrador"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden gap-1 sm:flex lg:hidden">
              {navigation.map((item) => (
                <Button asChild key={item.to} size="sm" variant="ghost">
                  <NavLink to={item.to}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                </Button>
              ))}
            </div>
            <Button onClick={onLogout} size="sm" variant="outline">
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </header>
        <main
          className={cn(
            isAgentMonitor
              ? "h-[calc(100vh-8rem)] min-h-[32rem] lg:h-[calc(100vh-4rem)] lg:min-h-[38rem]"
              : "mx-auto grid max-w-7xl gap-5 p-4 pb-24 lg:p-6",
          )}
        >
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t bg-white p-2 shadow-soft lg:hidden">
        {navigation.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium text-muted-foreground",
                isActive && "bg-primary/10 text-primary",
              )
            }
            key={item.to}
            to={item.to}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
