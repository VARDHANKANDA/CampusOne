import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useAssignComplaint,
  useComplaintQueue,
  useMaintenanceStaff,
} from "@/features/complaint/api";
import { COMPLAINT_STATUS_TONE } from "@/features/complaint/statusTone";

/** docs/PRD.md FR-4.3 — warden assigns complaints to maintenance staff.
 * Staff options come from GET /users, which the backend scopes to
 * maintenance_staff-only for a warden caller (docs/DECISIONS.md ADR-015).
 */
export function ComplaintQueuePage(): React.JSX.Element {
  const { data: complaints, isLoading } = useComplaintQueue();
  const { data: staff } = useMaintenanceStaff();
  const assignComplaint = useAssignComplaint();
  const [selected, setSelected] = useState<Record<string, string>>({});

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading the complaint queue…</p>;
  }

  if (!complaints || complaints.length === 0) {
    return (
      <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
        <p className="font-body text-sm text-slate">No complaints in the queue.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Complaint Queue</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {complaints.map((complaint) => (
          <PlaqueCard
            key={complaint.id}
            identifierLabel="Complaint"
            identifier={complaint.id.slice(0, 8)}
            title={complaint.category}
            meta={complaint.description}
            status={
              <div className="flex flex-col items-end gap-2">
                <StatusBadge
                  label={complaint.status.replace("_", " ")}
                  tone={COMPLAINT_STATUS_TONE[complaint.status]}
                />
                {complaint.status === "submitted" && (
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-plaque border border-slate/30 bg-chalk px-2 py-1 font-body text-xs text-ink-navy"
                      value={selected[complaint.id] ?? ""}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [complaint.id]: e.target.value }))
                      }
                    >
                      <option value="">Select staff…</option>
                      {staff?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      isLoading={
                        assignComplaint.isPending &&
                        assignComplaint.variables?.complaintId === complaint.id
                      }
                      disabled={!selected[complaint.id]}
                      onClick={() =>
                        assignComplaint.mutate({
                          complaintId: complaint.id,
                          assignedTo: selected[complaint.id],
                        })
                      }
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
