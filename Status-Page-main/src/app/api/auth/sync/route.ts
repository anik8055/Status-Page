import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, orgMembers, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // fetch Clerk user info
  const userResp = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
  });

  const clerkUser = await userResp.json();

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existing) {
    await db.insert(users).values({
      id: userId,
      name: `${clerkUser.first_name ?? ""} ${clerkUser.last_name ?? ""}`,
      email: clerkUser.email_addresses[0].email_address,
    });
  }

  // Fetch organizations user is part of
  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      description: organizations.description,
      createdAt: organizations.createdAt,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, userId));

  return Response.json({ orgs });
}
