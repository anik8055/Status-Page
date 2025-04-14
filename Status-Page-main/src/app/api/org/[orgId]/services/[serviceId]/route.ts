import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { services, orgMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE endpoint for deleting a service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; serviceId: string }> }
) {
  try {
    const { userId } = await auth();
    const { orgId, serviceId } = await params;

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if user has permission (is admin or owner)
    const userRole = await db.query.orgMembers.findFirst({
      where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
    });

    if (!userRole || !["admin", "owner"].includes(userRole.role)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Delete the service
    await db
      .delete(services)
      .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting service:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

interface ServiceUpdateData {
  name: string;
  description?: string | null;
  url?: string | null;
  status: string;
  rolesAllowed?: string[];
}

// PATCH endpoint for updating a service
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; serviceId: string }> }
) {
  try {
    const { userId } = await auth();
    const { orgId, serviceId } = await params;

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if user has permission (is admin or owner)
    const userRole = await db.query.orgMembers.findFirst({
      where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
    });

    if (!userRole || !["admin", "owner"].includes(userRole.role)) {
      return new Response("Forbidden", { status: 403 });
    }

    const body = (await request.json()) as ServiceUpdateData;
    const { name, description, url, status, rolesAllowed } = body;

    // Convert rolesAllowed array to comma-separated string
    const rolesAllowedString = Array.isArray(rolesAllowed)
      ? rolesAllowed.join(",")
      : "";

    // Update using the Drizzle ORM method instead of raw SQL
    console.log("Updating service:", {
      name,
      description,
      url,
      status,
      rolesAllowed: rolesAllowedString,
    });
    console.log("Service ID:", serviceId, orgId);
    const updated = await db
      .update(services)
      .set({
        name,
        description,
        url,
        status,
        rolesAllowed: rolesAllowedString,
        updatedAt: new Date(),
      })
      .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)))
      .returning();

    console.log(updated[0]); // check if it returns the updated row

    return new Response(
      JSON.stringify({
        message: "Service updated successfully",
        service: {
          ...updated[0],
          rolesAllowed: updated[0].rolesAllowed
            ? updated[0].rolesAllowed.split(",")
            : [],
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Error updating service:", error);

    // Specific error handling
    if (error instanceof Error) {
      if (error.message.includes("ECONNECT")) {
        return new Response(
          JSON.stringify({
            message: "Database connection error. Please try again.",
            error: error.message,
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// GET endpoint for fetching a service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; serviceId: string }> }
) {
  try {
    const { userId } = await auth();
    const { orgId, serviceId } = await params;

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if user has permission (is admin or owner)
    const userRole = await db.query.orgMembers.findFirst({
      where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
    });

    if (!userRole || !["admin", "owner"].includes(userRole.role)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Fetch the service
    const service = await db.query.services.findFirst({
      where: and(eq(services.id, serviceId), eq(services.orgId, orgId)),
    });

    if (!service) {
      return new Response("Service not found", { status: 404 });
    }

    // Parse rolesAllowed from string to array
    const parsedService = {
      ...service,
      rolesAllowed: service.rolesAllowed ? service.rolesAllowed.split(",") : [],
    };

    return new Response(JSON.stringify(parsedService), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching service:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
