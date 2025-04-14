import { db } from "@/db";
import { services, orgMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { userId } = await auth();
  const { orgId } = await params;

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await req.json();
  const { name, description, url, status, rolesAllowed } = body;

  // Check if the user is admin or owner in this org
  const [orgMember] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, orgId)));

  if (!orgMember || !["admin", "owner"].includes(orgMember.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  const result = await db
    .insert(services)
    .values({
      orgId,
      name,
      description,
      url,
      status,
      rolesAllowed,
      createdBy: userId,
    })
    .returning();

  return new Response(JSON.stringify(result[0]), { status: 200 });
}
