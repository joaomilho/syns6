import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/**
 * Get the current session on the server side
 * Use this in Server Components and API routes
 */
export async function getSession() {
  return await getServerSession(authOptions);
}
