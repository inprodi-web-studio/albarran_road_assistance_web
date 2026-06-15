import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AdminUser, LoginResponse } from "@/lib/types";

const TOKEN_KEY = "auxilio-admin-token";
const USER_KEY = "auxilio-admin-user";

type AuthState = {
  token: string | null;
  user: AdminUser | null;
};

const readStoredUser = (): AdminUser | null => {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as AdminUser) : null;
  } catch {
    return null;
  }
};

const initialState: AuthState = {
  token: localStorage.getItem(TOKEN_KEY),
  user: readStoredUser(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponse>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem(TOKEN_KEY, action.payload.token);
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});

export const { logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;
