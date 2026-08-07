import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Role } from "@/core/auth/types";
import { useAllUsers, useDeactivateUser, useUpdateUser } from "@/features/admin/usersApi";

const ROLES: Role[] = ["student", "faculty", "warden", "maintenance_staff", "admin"];

/** docs/PRD.md FR-14.1 — manage user accounts: role, department, active status. */
export function AdminUsersPage(): React.JSX.Element {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data: users, isLoading } = useAllUsers(includeInactive);
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink-navy">Users</h1>
        <label className="flex items-center gap-2 font-body text-sm text-slate">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Show deactivated
        </label>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-slate">Loading users…</p>
      ) : (
        <div className="overflow-x-auto rounded-plaque border border-slate/15 bg-white shadow-level-1">
          <table className="w-full text-left font-body text-sm">
            <thead className="border-b border-slate/15 text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/10">
              {users?.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-2 text-ink-navy">{user.full_name}</td>
                  <td className="px-4 py-2 text-slate">{user.email}</td>
                  <td className="px-4 py-2">
                    <select
                      className="rounded-plaque border border-slate/30 bg-chalk px-2 py-1 text-xs text-ink-navy"
                      value={user.role}
                      onChange={(e) =>
                        updateUser.mutate({ userId: user.id, role: e.target.value as Role })
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-slate">{user.department ?? "—"}</td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      label={user.is_active ? "Active" : "Deactivated"}
                      tone={user.is_active ? "success" : "muted"}
                    />
                  </td>
                  <td className="px-4 py-2">
                    {user.is_active ? (
                      <Button
                        variant="secondary"
                        isLoading={deactivateUser.isPending && deactivateUser.variables === user.id}
                        onClick={() => deactivateUser.mutate(user.id)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        isLoading={updateUser.isPending && updateUser.variables?.userId === user.id}
                        onClick={() => updateUser.mutate({ userId: user.id, is_active: true })}
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
    </div>
  );
}
