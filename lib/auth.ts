import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidSession, SESSION_COOKIE } from "./session";

export { createSessionToken, isValidSession, SESSION_COOKIE } from "./session";

export async function requireAdmin() {
  const jar = await cookies();
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value))) {
    redirect("/admin/login");
  }
}
