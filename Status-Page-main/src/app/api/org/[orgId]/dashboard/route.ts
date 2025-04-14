import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { orgMembers, organizations, services } from "@/db/schema";
import { NextRequest } from "next/server";

// Add interface for Service type
interface Service {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  url: string | null;
  status: string;
  rolesAllowed: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth();
    const { orgId } = await params;

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get user's role in the organization
    const userRole = await db.query.orgMembers.findFirst({
      where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
    });

    if (!userRole) {
      return new Response("Forbidden", { status: 403 });
    }

    // Get organization details
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    // Get all services first
    const allServices = (await db.query.services.findMany({
      where: eq(services.orgId, orgId),
    })) as Service[];

    // Filter services based on role unless user is admin/owner
    const filteredServices = ["admin", "owner"].includes(userRole.role)
      ? allServices
      : allServices.filter((service: Service) => {
          if (!service.rolesAllowed) return true;
          return service.rolesAllowed.split(",").includes(userRole.role);
        });

    return new Response(
      JSON.stringify({
        organization,
        services: filteredServices,
        role: userRole.role,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
