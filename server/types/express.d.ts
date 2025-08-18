import { User } from "@shared/auth";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
