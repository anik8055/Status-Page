"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const roles = ["owner", "admin", "member", "viewer"];
const statusOptions = [
  { value: "operational", label: "Operational" },
  { value: "degraded", label: "Degraded Performance" },
  { value: "partial_outage", label: "Partial Outage" },
  { value: "major_outage", label: "Major Outage" },
  { value: "maintenance", label: "Under Maintenance" },
];

export default function EditServicePage() {
  const router = useRouter();
  const { orgId, serviceId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    status: "operational",
    rolesAllowed: [] as string[],
  });

  useEffect(() => {
    async function fetchService() {
      try {
        const res = await fetch(`/api/org/${orgId}/services/${serviceId}`);
        if (!res.ok) throw new Error("Failed to fetch service");
        const data = await res.json();
        setFormData({
          name: data.name,
          description: data.description || "",
          url: data.url || "",
          status: data.status,
          rolesAllowed: data.rolesAllowed || [],
        });
      } catch (error) {
        console.error("Error fetching service:", error);
        toast.error("Failed to load service data");
        router.push(`/org/${orgId}`);
      } finally {
        setLoading(false);
      }
    }

    fetchService();
  }, [orgId, serviceId, router]);

  const handleCheckboxChange = (role: string) => {
    setFormData((prev) => {
      const alreadyChecked = prev.rolesAllowed.includes(role);
      return {
        ...prev,
        rolesAllowed: alreadyChecked
          ? prev.rolesAllowed.filter((r) => r !== role)
          : [...prev.rolesAllowed, role],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/org/${orgId}/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update service");

      toast.success("Service updated successfully");
      router.push(`/org/${orgId}`);
    } catch (error) {
      console.error("Error updating service:", error);
      toast.error("Failed to update service");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Edit Service</h2>
          <p className="text-gray-600 mt-2">Update service information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Service Name
            </Label>
            <Input
              id="name"
              placeholder="Enter service name"
              className="w-full transition-all focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe your service..."
              className="w-full min-h-[100px] transition-all focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm font-medium">
              Service URL
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://your-service.com"
              className="w-full transition-all focus:ring-2 focus:ring-blue-500"
              value={formData.url}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, url: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">
              Current Status
            </Label>
            <select
              id="status"
              className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Visible to Roles</Label>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              {roles.map((role) => (
                <div key={role} className="flex items-center space-x-3">
                  <Checkbox
                    id={role}
                    className="h-5 w-5"
                    checked={formData.rolesAllowed.includes(role)}
                    onCheckedChange={() => handleCheckboxChange(role)}
                  />
                  <Label htmlFor={role} className="capitalize text-sm">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 flex-col">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/org/${orgId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
