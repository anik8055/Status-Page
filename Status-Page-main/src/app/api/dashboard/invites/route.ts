// app/api/dashboard/invites/route.ts

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const clerkUser = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
  });

  const user = await clerkUser.json();
  const email = user.email_addresses[0].email_address;

  const userInvites = await db.query.invites.findMany({
    where: eq(invites.email, email),
  });

  return Response.json(userInvites);
}
