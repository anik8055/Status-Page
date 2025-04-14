// app/api/invites/[inviteId]/accept/route.ts
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { invites, orgMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const { userId } = await auth();
  const { inviteId } = await params;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const invite = await db.query.invites.findFirst({
    where: eq(invites.id, inviteId),
  });

  if (!invite) return new Response("Invite not found", { status: 404 });

  await db.transaction(async (tx) => {
    await tx.insert(orgMembers).values({
      orgId: invite.orgId,
      userId,
      role: invite.role,
    });

    await tx.delete(invites).where(eq(invites.id, inviteId));
  });

  return new Response("Invite accepted");
}
