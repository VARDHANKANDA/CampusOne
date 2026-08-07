import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAvailableEquipment, useRequestEquipment } from "@/features/equipment/api";

/** docs/PRD.md FR-7.3 — faculty requests equipment. There is no endpoint yet
 * for a faculty member to see their own request history (docs/CHANGELOG.md
 * "Deferred" note) — this page confirms submission inline instead.
 */
export function EquipmentRequestsPage(): React.JSX.Element {
  const { data: equipment, isLoading } = useAvailableEquipment();
  const requestEquipment = useRequestEquipment();
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading equipment…</p>;
  }

  if (!equipment || equipment.length === 0) {
    return (
      <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
        <p className="font-body text-sm text-slate">No equipment currently available to request.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Equipment Requests</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {equipment.map((item) => (
          <PlaqueCard
            key={item.id}
            identifierLabel="Category"
            identifier={item.category}
            title={item.name}
            status={
              requestedIds.has(item.id) ? (
                <StatusBadge label="Requested" tone="pending" />
              ) : (
                <Button
                  variant="secondary"
                  isLoading={
                    requestEquipment.isPending &&
                    requestEquipment.variables?.equipmentId === item.id
                  }
                  onClick={() =>
                    requestEquipment.mutate(
                      { equipmentId: item.id },
                      {
                        onSuccess: () => setRequestedIds((prev) => new Set(prev).add(item.id)),
                      },
                    )
                  }
                >
                  Request
                </Button>
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
