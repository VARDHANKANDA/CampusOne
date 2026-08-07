import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useMyComplaints, useVerifyComplaint } from "@/features/complaint/api";
import { COMPLAINT_STATUS_TONE } from "@/features/complaint/statusTone";

/** docs/PRD.md FR-4.4 — track status in real time (Realtime wiring lands in
 * Module 11; for now this refetches via TanStack Query); FR-4.5 — verify
 * completion before it closes.
 */
export function MyComplaintsPage(): React.JSX.Element {
  const { data: complaints, isLoading } = useMyComplaints();
  const verifyComplaint = useVerifyComplaint();

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading your complaints…</p>;
  }

  if (!complaints || complaints.length === 0) {
    return (
      <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
        <p className="font-body text-sm text-slate">
          No complaints yet — submit one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">My Complaints</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {complaints.map((complaint) => (
          <PlaqueCard
            key={complaint.id}
            identifierLabel="Complaint"
            identifier={complaint.id.slice(0, 8)}
            title={complaint.category}
            meta={complaint.description}
            status={
              <div className="flex items-center gap-2">
                <StatusBadge
                  label={complaint.status.replace("_", " ")}
                  tone={COMPLAINT_STATUS_TONE[complaint.status]}
                />
                {complaint.status === "completed" && (
                  <Button
                    variant="secondary"
                    isLoading={
                      verifyComplaint.isPending && verifyComplaint.variables === complaint.id
                    }
                    onClick={() => verifyComplaint.mutate(complaint.id)}
                  >
                    Verify
                  </Button>
                )}
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
