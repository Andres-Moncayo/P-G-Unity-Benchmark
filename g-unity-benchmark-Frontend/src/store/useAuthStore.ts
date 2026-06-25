import { create } from "zustand";

type UserRole = "guest" | "admin";

interface AuthState {
  role: UserRole;
  toggleRole: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: "guest",
  toggleRole: () =>
    set((state) => ({ role: state.role === "guest" ? "admin" : "guest" })),
}));
