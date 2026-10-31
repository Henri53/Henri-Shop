import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "OWNER";
    } & DefaultSession["user"];
  }
  interface User {
    role: "CUSTOMER" | "OWNER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CUSTOMER" | "OWNER";
  }
}
