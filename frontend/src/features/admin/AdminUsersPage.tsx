import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/core/api/types";
import type { Role } from "@/core/auth/types";
import { useAllUsers, useDeactivateUser, useUpdateUser, useCreateUser } from "@/features/admin/usersApi";
import { exportToCSV } from "@/utils/export";

const ROLES: Role[] = ["student", "faculty", "warden", "maintenance_staff", "admin"];

export function AdminUsersPage(): React.JSX.Element {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data: users, isLoading } = useAllUsers(includeInactive);
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const createUser = useCreateUser();

  // Create User Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("student");
  const [newDept, setNewDept] = useState("");

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    createUser.mutate(
      {
        full_name: newFullName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        department: newDept || null,
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          // reset form fields
          setNewFullName("");
          setNewEmail("");
          setNewPassword("");
          setNewRole("student");
          setNewDept("");
        },
        onError: (err: unknown) => {
          setCreateError(
            err instanceof ApiError ? err.message : "Failed to create user. Please verify input fields."
          );
        },
      }
    );
  };

  const handleExportUsers = () => {
    if (!users) return;
    const exportData = users.map((u) => ({
      ID: u.id,
      "Full Name": u.full_name,
      Email: u.email,
      Role: u.role,
      Department: u.department || "N/A",
      Status: u.is_active ? "Active" : "Deactivated",
    }));
    exportToCSV(exportData, "campus_users_directory.csv");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">User Accounts Directory</h1>
          <p className="font-body text-xs text-slate mt-1">Manage student, faculty, warden, and technical staff access roles</p>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <Button onClick={() => setIsModalOpen(true)} className="py-2.5 px-4 font-semibold text-xs">
            Create User Account
          </Button>
          <Button onClick={handleExportUsers} variant="secondary" className="py-2.5 px-4 font-semibold text-xs">
            Export directory CSV
          </Button>
        </div>
      </div>

      {/* Filter Options bar */}
      <div className="flex justify-between items-center bg-card-bg border border-card-border p-4 rounded-plaque">
        <label className="flex items-center gap-2 cursor-pointer font-body text-xs font-semibold text-text-primary">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-card-border text-brass focus:ring-brass h-4 w-4"
          />
          Show deactivated accounts
        </label>
        <span className="font-mono text-xs text-slate">{users?.length || 0} users found</span>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-slate">Loading users directory…</p>
      ) : (
        <div className="overflow-x-auto rounded-plaque border border-card-border bg-card-bg shadow-level-1">
          <table className="w-full text-left font-body text-sm border-collapse">
            <thead className="border-b border-card-border bg-canvas/40 text-[10px] uppercase font-bold tracking-wider text-slate">
              <tr>
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3">Email Address</th>
                <th className="px-5 py-3">System Role</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-canvas/10 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-text-primary">{user.full_name}</td>
                  <td className="px-5 py-3.5 text-slate">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <select
                      className="rounded-plaque border border-card-border bg-canvas px-2.5 py-1 text-xs text-text-primary font-semibold outline-none focus:ring-1 focus:ring-brass"
                      value={user.role}
                      onChange={(e) =>
                        updateUser.mutate({ userId: user.id, role: e.target.value as Role })
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{user.department ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge
                      label={user.is_active ? "Active" : "Deactivated"}
                      tone={user.is_active ? "success" : "muted"}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {user.is_active ? (
                      <Button
                        variant="secondary"
                        isLoading={deactivateUser.isPending && deactivateUser.variables === user.id}
                        onClick={() => deactivateUser.mutate(user.id)}
                        className="py-1 px-3 text-xs bg-brick/10 hover:bg-brick/20 border-brick/20 text-brick"
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        isLoading={updateUser.isPending && updateUser.variables?.userId === user.id}
                        onClick={() => updateUser.mutate({ userId: user.id, is_active: true })}
                        className="py-1 px-3 text-xs"
                      >
                        Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Creation Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card-bg border border-card-border rounded-plaque p-6 shadow-level-3 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-card-border pb-3">
              <h3 className="font-display text-base font-bold text-text-primary">Create User Account</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate hover:text-text-primary transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createError && (
              <div role="alert" className="rounded-plaque border border-brick/35 bg-brick/5 p-3 text-xs font-semibold text-brick">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <TextField
                label="Full Name"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                required
              />
              <TextField
                label="Email address"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <TextField
                label="Password credential"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />

              <div className="flex flex-col gap-1">
                <label htmlFor="modal-role" className="font-body text-xs font-semibold text-text-primary">
                  System Role
                </label>
                <select
                  id="modal-role"
                  className="rounded-plaque border border-card-border bg-canvas px-3 py-2 font-body text-sm text-text-primary outline-none focus:ring-2 focus:ring-brass"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <TextField
                label="Department (Optional)"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-card-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4"
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={createUser.isPending} className="py-2 px-5">
                  Register User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
