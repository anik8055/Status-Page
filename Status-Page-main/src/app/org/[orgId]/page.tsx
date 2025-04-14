"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DeleteServiceModal } from "@/components/DeleteServiceModal";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Organization, Service } from "@/types";
import { Logo } from "@/components/Logo";

interface DashboardData {
  organization: Organization;
  services: Service[];
  role: string;
}

// Add this type for the status classes
type StatusClassType = {
  [key: string]: string;
};

export default function OrgDashboardPage() {
  const { orgId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    serviceId: string | null;
    serviceName: string;
  }>({
    isOpen: false,
    serviceId: null,
    serviceName: "",
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/${orgId}/dashboard`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      fetchDashboardData();
    }
  }, [orgId, fetchDashboardData]);

  const handleDeleteService = async () => {
    if (!deleteModal.serviceId) return;

    try {
      const res = await fetch(
        `/api/org/${orgId}/services/${deleteModal.serviceId}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        toast.success("Service deleted successfully");
        // Refresh the data
        fetchDashboardData();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to delete service");
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("An unexpected error occurred");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-800">
            Error loading data
          </h3>
          <p className="text-gray-600 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const isAdminOrOwner = data?.role === "admin" || data?.role === "owner";

  const getStatusBadgeClass = (status: string) => {
    const baseClass = "px-2 py-1 rounded-full text-xs font-medium";
    const statusClasses: StatusClassType = {
      operational: "bg-green-100 text-green-800",
      degraded: "bg-yellow-100 text-yellow-800",
      partial_outage: "bg-orange-100 text-orange-800",
      major_outage: "bg-red-100 text-red-800",
      maintenance: "bg-blue-100 text-blue-800",
    };
    return `${baseClass} ${
      statusClasses[status] || "bg-gray-100 text-gray-800"
    }`;
  };

  const canViewService = (service: Service, userRole: string) => {
    if (!service.rolesAllowed) return true;
    const allowedRoles = service.rolesAllowed.split(",");
    return allowedRoles.includes(userRole);
  };

  // Filter services based on user's role
  const filteredServices =
    data?.services.filter((service) => canViewService(service, data.role)) ||
    [];

  // Add this helper function at the top of your component
  const getRolesList = (rolesAllowed: string | null) => {
    if (!rolesAllowed) return [];
    return rolesAllowed.split(",");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Logo />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {data.organization.name}
              </h1>
              <p className="text-gray-600 mt-2">
                {data.organization.description}
              </p>
            </div>
            {isAdminOrOwner && (
              <Button
                onClick={() => router.push(`/org/${orgId}/add-service`)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                + Add Service
              </Button>
            )}
          </div>
        </div>

        {isAdminOrOwner && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Invite a User
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsInviting(true);

                const form = e.currentTarget as HTMLFormElement;
                const emailInput = form.elements.namedItem(
                  "email"
                ) as HTMLInputElement;
                const roleSelect = form.elements.namedItem(
                  "role"
                ) as HTMLSelectElement;

                const email = emailInput.value;
                const role = roleSelect.value || "member";

                try {
                  const res = await fetch(`/api/org/${orgId}/invite`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, role }),
                  });

                  if (res.ok) {
                    toast.success("Invite sent successfully!");
                    form.reset();
                  } else {
                    const err = await res.json();
                    toast.error(`Failed to send invite: ${err.error}`);
                  }
                } catch (error) {
                  console.error("Error sending invite:", error);
                  toast.error("An unexpected error occurred");
                } finally {
                  setIsInviting(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Enter user's email"
                  className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isInviting}
                />
                <select
                  name="role"
                  className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isInviting}
                >
                  <option value="">Select role</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                disabled={isInviting}
              >
                {isInviting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                    Sending Invite...
                  </div>
                ) : (
                  "Send Invite"
                )}
              </Button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Services
          </h2>
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {data.services.length === 0
                ? "No services have been added yet."
                : "You don't have access to view any services."}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredServices.map((service: Service) => (
                <div
                  key={service.id}
                  className="p-6 bg-gray-50 rounded-lg hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {service.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={getStatusBadgeClass(service.status)}>
                          {service.status
                            .replace("_", " ")
                            .charAt(0)
                            .toUpperCase() + service.status.slice(1)}
                        </span>

                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">
                            Visible to:
                          </span>
                          <div className="flex gap-1">
                            {service.rolesAllowed ? (
                              service.rolesAllowed
                                .split(",")
                                .map((role: string) => (
                                  <span
                                    key={role}
                                    className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full"
                                  >
                                    {role}
                                  </span>
                                ))
                            ) : (
                              <span className="text-sm text-gray-500">
                                All roles
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isAdminOrOwner && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() =>
                            router.push(
                              `/org/${orgId}/services/${service.id}/edit`
                            )
                          }
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex items-center gap-1"
                          onClick={() =>
                            setDeleteModal({
                              isOpen: true,
                              serviceId: service.id,
                              serviceName: service.name,
                            })
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-gray-600 mb-3">{service.description}</p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-4">
                      {service.url && (
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                        >
                          <span>Visit Service</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Access:</span>
                        {service.rolesAllowed ? (
                          <div className="flex flex-wrap gap-1">
                            {getRolesList(service.rolesAllowed).map(
                              (role: string, index: number) => (
                                <div key={role} className="flex items-center">
                                  <span className="text-sm text-gray-700 capitalize">
                                    {role}
                                  </span>
                                  {index <
                                    getRolesList(service.rolesAllowed).length -
                                      1 && (
                                    <span className="mx-1 text-gray-400">
                                      •
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-700">
                            Available to all roles
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DeleteServiceModal
          isOpen={deleteModal.isOpen}
          onClose={() =>
            setDeleteModal({ isOpen: false, serviceId: null, serviceName: "" })
          }
          onConfirm={handleDeleteService}
          serviceName={deleteModal.serviceName}
        />
      </div>
    </div>
  );
}
