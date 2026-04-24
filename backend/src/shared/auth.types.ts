import { UserRole } from "./types";

export type RequestUser = {
  id: string;
  email?: string;
  role: UserRole;
};
