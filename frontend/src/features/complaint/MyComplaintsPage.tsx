import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useMyComplaints, useVerifyComplaint } from "@/features/complaint/api";
import { COMPLAINT_STATUS_TONE } from "@/features/complaint/statusTone";

export function MyComplaintsPage(): React.JSX.Element {
  const { data: complaints, isLoading } = useMyComplaints();
  const verifyComplaint = useVerifyComplaint();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading your complaints…</p>;
  }

  if (!complaints || complaints.length === 0) {
    return (
      <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-card-bg/50 px-6 py-10 text-center">
        <p className="font-body text-sm text-slate">
          No complaints yet — submit one to get started.
        </p>
      </div>
    );
  }

  const getRemainingSlaText = (slaDueAt: string | null, status: string) => {
    if (!slaDueAt) return null;
    if (status === "completed" || status === "verified") return "SLA Met";
    const diff = new Date(slaDueAt).getTime() - Date.now();
    if (diff <= 0) return "SLA Breached (Escalated)";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `SLA Due: ${hours}h ${mins}m remaining`;
    }
    return `SLA Due: ${mins}m remaining`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">My Reported Complaints</h1>
        <p className="font-body text-xs text-slate mt-1">Track maintenance progress, SLA timelines, and verify repairs</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {complaints.map((complaint) => {
          const isExpanded = expandedId === complaint.id;
          const slaText = getRemainingSlaText(complaint.sla_due_at, complaint.status);
          const isBreached = complaint.sla_breached || (complaint.sla_due_at && new Date(complaint.sla_due_at).getTime() < Date.now() && complaint.status !== "completed" && complaint.status !== "verified");

          return (
            <div
              key={complaint.id}
              className={`rounded-plaque border border-card-border bg-card-bg transition duration-150 overflow-hidden ${
                isExpanded ? "ring-1 ring-brass" : "hover:border-brass/40"
              }`}
            >
              {/* Card Header Panel */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                className="p-5 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate bg-canvas px-2 py-0.5 rounded uppercase font-bold">
                      #{complaint.id.slice(0, 8)}
                    </span>
                    <span className="font-display text-sm font-bold text-text-primary capitalize">
                      {complaint.category}
                    </span>
                    <StatusBadge
                      label={complaint.status.replace("_", " ")}
                      tone={COMPLAINT_STATUS_TONE[complaint.status]}
                    />
                  </div>
                  <p className="font-body text-xs text-text-primary line-clamp-2 md:line-clamp-1 max-w-2xl">
                    {complaint.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-stretch md:self-auto justify-between border-t md:border-t-0 border-card-border pt-3 md:pt-0">
                  <div className="text-right">
                    <span className="block text-[10px] text-slate font-bold uppercase tracking-wider">
                      Priority: {complaint.priority}
                    </span>
                    {slaText && (
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          isBreached && complaint.status !== "completed" && complaint.status !== "verified"
                            ? "text-brick"
                            : "text-quad-green"
                        }`}
                      >
                        {slaText}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`h-5 w-5 text-slate transform transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Card Expanded Detail Panel */}
              {isExpanded && (
                <div className="border-t border-card-border bg-canvas/30 p-5 space-y-6 animate-in fade-in duration-150">
                  
                  {/* Before / After Photos Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="block text-[10px] text-slate font-bold uppercase tracking-wider">
                        Reported Photo (Before)
                      </span>
                      {complaint.image_url ? (
                        <img
                          src={complaint.image_url}
                          alt="Reported complaint visual evidence"
                          className="w-full h-48 object-cover rounded-plaque border border-card-border"
                        />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center border border-dashed border-card-border rounded-plaque text-slate text-xs">
                          No photo provided on submission
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <span className="block text-[10px] text-slate font-bold uppercase tracking-wider">
                        Technician Fix Photo (After)
                      </span>
                      {complaint.completion_image_url ? (
                        <img
                          src={complaint.completion_image_url}
                          alt="Technician repair visual evidence"
                          className="w-full h-48 object-cover rounded-plaque border border-card-border"
                        />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center border border-dashed border-card-border rounded-plaque bg-slate/5 text-slate text-xs">
                          {complaint.status === "completed" || complaint.status === "verified"
                            ? "No completion photo provided"
                            : "Waiting for technician completion photo"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Technician Notes & Costing section */}
                  {(complaint.feedback || complaint.cost !== null) && (
                    <div className="rounded-plaque border border-card-border bg-card-bg p-4 space-y-2.5">
                      <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
                        Technician Work Order Summary
                      </h4>
                      {complaint.feedback && (
                        <p className="font-body text-xs text-text-primary">
                          <span className="font-semibold text-slate block mb-0.5">Technician Notes:</span>
                          {complaint.feedback}
                        </p>
                      )}
                      {complaint.cost !== null && (
                        <p className="font-body text-xs text-text-primary">
                          <span className="font-semibold text-slate">Repair Work Cost: </span>
                          <span className="font-bold text-quad-green">${complaint.cost.toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Escalation triggers warning */}
                  {complaint.escalated_to_admin && (
                    <div className="rounded-plaque border border-brick/35 bg-brick/5 p-4 text-xs font-medium text-brick">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>SLA Breached</span>
                      </div>
                      This complaint exceeded its designated SLA due date and has been automatically escalated to administrative WARDENS for rapid review.
                    </div>
                  )}

                  {/* Student Verification Action Panel */}
                  {complaint.status === "completed" && (
                    <div className="border-t border-card-border pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="font-display text-xs font-bold text-text-primary">
                          Review Technician Repair Completion
                        </h4>
                        <p className="text-xs text-slate mt-0.5">
                          Please verify if this issue has been fully resolved. Once approved, the ticket will be permanently closed.
                        </p>
                      </div>
                      <Button
                        isLoading={verifyComplaint.isPending && verifyComplaint.variables === complaint.id}
                        onClick={() => verifyComplaint.mutate(complaint.id)}
                        className="py-2.5 px-6 bg-quad-green hover:bg-quad-green/90 text-white font-bold"
                      >
                        Approve & Verify Resolution
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
