import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useMyMaintenanceTasks, useUpdateMaintenanceTask } from "@/features/maintenance/api";
import { MAINTENANCE_STATUS_TONE } from "@/features/maintenance/statusTone";
import type { MaintenanceRequestStatus } from "@/features/maintenance/types";

const NEXT_STATUS: Record<MaintenanceRequestStatus, MaintenanceRequestStatus | null> = {
  pending: "in_progress",
  in_progress: "completed",
  completed: null,
};

/** docs/PRD.md FR-9.3 — maintenance staff update status and upload completion
 * photos. "My Tasks", "Update Status", and "Completion Upload" (docs/UI_UX.md
 * §4) are all this one view — the action lives inline on each task card.
 */
export function MyTasksPage(): React.JSX.Element {
  const { data: tasks, isLoading } = useMyMaintenanceTasks();
  const updateTask = useUpdateMaintenanceTask();
  const [photoByTask, setPhotoByTask] = useState<Record<string, File | undefined>>({});

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading your tasks…</p>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
        <p className="font-body text-sm text-slate">No tasks assigned to you right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">My Tasks</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => {
          const nextStatus = NEXT_STATUS[task.status];
          return (
            <PlaqueCard
              key={task.id}
              identifierLabel="Task"
              identifier={task.id.slice(0, 8)}
              title={task.feedback || "Maintenance task"}
              meta={
                task.actual_completion
                  ? `Completed ${new Date(task.actual_completion).toLocaleDateString()}`
                  : undefined
              }
              status={
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge
                    label={task.status.replace("_", " ")}
                    tone={MAINTENANCE_STATUS_TONE[task.status]}
                  />
                  {nextStatus && (
                    <div className="flex items-center gap-2">
                      {nextStatus === "completed" && (
                        <input
                          type="file"
                          accept="image/*"
                          className="w-32 font-body text-xs text-slate"
                          onChange={(e) =>
                            setPhotoByTask((prev) => ({
                              ...prev,
                              [task.id]: e.target.files?.[0],
                            }))
                          }
                        />
                      )}
                      <Button
                        variant="secondary"
                        isLoading={
                          updateTask.isPending && updateTask.variables?.requestId === task.id
                        }
                        onClick={() =>
                          updateTask.mutate({
                            requestId: task.id,
                            status: nextStatus,
                            photo: photoByTask[task.id],
                          })
                        }
                      >
                        Mark {nextStatus.replace("_", " ")}
                      </Button>
                    </div>
                  )}
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
