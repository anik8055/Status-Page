import { db } from "@/db";
import { invites, orgMembers, users } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });

  const { email, role } = await req.json();
  const { orgId } = await params;

  if (!email || !role) {
    return new Response(
      JSON.stringify({ error: "Email and role are required" }),
      { status: 400 }
    );
  }

  const inviter = await db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
  });

  if (!inviter || !["admin", "owner"].includes(inviter.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!targetUser) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
    });
  }

  const alreadyInvited = await db.query.invites.findFirst({
    where: and(eq(invites.orgId, orgId), eq(invites.email, targetUser.email)),
  });

  if (alreadyInvited) {
    return new Response(JSON.stringify({ error: "User already invited" }), {
      status: 409,
    });
  }

  const alreadyMember = await db.query.orgMembers.findFirst({
    where: and(
      eq(orgMembers.orgId, orgId),
      eq(orgMembers.userId, targetUser.id)
    ),
  });

  if (alreadyMember) {
    return new Response(JSON.stringify({ error: "User already a member" }), {
      status: 409,
    });
  }

  await db.insert(invites).values({
    orgId,
    email: targetUser.email,
    role,
    invitedBy: userId,
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
