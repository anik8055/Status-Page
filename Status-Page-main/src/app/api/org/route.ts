import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { organizations, orgMembers } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return new Response(JSON.stringify({ message: "Name is required" }), {
        status: 400,
      });
    }

    // Create organization and add creator as owner in a transaction
    const result = await db.transaction(async (tx) => {
      // Create the organization
      const [org] = await tx
        .insert(organizations)
        .values({
          name,
          description,
        })
        .returning();

      // Add the creator as an owner
      await tx.insert(orgMembers).values({
        orgId: org.id,
        userId,
        role: "owner",
      });

      return org;
    });

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
