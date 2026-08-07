import { useState } from "react";

import { TextField } from "@/components/ui/TextField";
import { useAuditLogs } from "@/features/audit/api";

/** docs/PRD.md FR-13.2 — search/filter audit logs by actor and entity type.
 * Dense tabular data, per docs/UI_UX.md §5.3, not plaque cards.
 */
export function AuditLogsPage(): React.JSX.Element {
  const [entityType, setEntityType] = useState("");
  const [actorId, setActorId] = useState("");
  const { data: logs, isLoading } = useAuditLogs({
    entity_type: entityType || undefined,
    actor_id: actorId || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Audit Logs</h1>

      <div className="flex flex-wrap gap-3">
        <TextField
          label="Entity type"
          placeholder="e.g. booking"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
        <TextField
          label="Actor ID"
          placeholder="user UUID"
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-slate">Loading…</p>
      ) : !logs || logs.length === 0 ? (
        <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
          <p className="font-body text-sm text-slate">No audit log entries match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-plaque border border-slate/15 bg-white shadow-level-1">
          <table className="w-full text-left font-body text-sm">
            <thead className="border-b border-slate/15 text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/10">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-slate">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-ink-navy">{log.action}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate">
                    {log.entity_type} · {log.entity_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate">
                    {log.actor_id ? log.actor_id.slice(0, 8) : "system"}
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
