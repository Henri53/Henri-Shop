import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {},
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith("/owner")) {
          return token?.role === "OWNER";
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/account/:path*", "/owner/:path*"],
};
