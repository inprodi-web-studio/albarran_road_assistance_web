import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setCredentials } from "@/features/auth/authSlice";
import { getErrorMessage, useLoginMutation } from "@/lib/api";
import { adminPaths } from "@/routes/paths";

export const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (token) {
    return <Navigate replace to={adminPaths.requests} />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await login({ email, password }).unwrap();
      dispatch(setCredentials(response));
      navigate(adminPaths.requests, { replace: true });
    } catch (currentError) {
      setError(getErrorMessage(currentError));
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-4">
      <form
        className="admin-panel grid w-full max-w-md gap-5 p-6"
        onSubmit={onSubmit}
      >
        <div className="grid justify-items-center gap-3 text-center">
          <img
            alt="Albarran"
            className="h-16 w-56 object-contain"
            src="/albarran-logo.png"
          />
          <div className="grid gap-1">
            <h1 className="text-xl font-semibold">Auxilio Vial Admin</h1>
            <p className="text-sm text-muted-foreground">
              Acceso administrativo
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Correo
          <Input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@albarran.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Contrasena
          <Input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Button disabled={isLoading} type="submit">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Entrar
        </Button>
      </form>
    </main>
  );
};
