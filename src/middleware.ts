// Middleware Next.js : s'exécute avant chaque requête
// On protège les routes qui nécessitent une authentification

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Routes qui nécessitent d'être connecté
const PROTECTED_PATHS = [
  "/feed",
  "/groups",
  "/messages",
  "/profile",
  "/settings",
  "/store",
  "/admin",
];

// Routes admin only
const ADMIN_PATHS = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Vérifier si la route est protégée
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isAdminOnly = ADMIN_PATHS.some((path) => pathname.startsWith(path));

  // Redirection si pas connecté sur route protégée
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Vérif admin
  if (isAdminOnly && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/feed", req.url));
  }

  return NextResponse.next();
});

// Configuration : quelles routes déclenchent le middleware
export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et l'API d'auth
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
