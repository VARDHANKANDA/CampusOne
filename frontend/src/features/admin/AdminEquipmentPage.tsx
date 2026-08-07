import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { useAllEquipment, useCreateEquipment } from "@/features/equipment/api";
import type { EquipmentCategory, EquipmentStatus } from "@/features/equipment/types";

const CATEGORIES: EquipmentCategory[] = [
  "projector",
  "computer",
  "lab_equipment",
  "smart_board",
  "furniture",
  "other",
];

const STATUS_TONE: Record<EquipmentStatus, "success" | "pending" | "muted"> = {
  available: "success",
  in_use: "pending",
  under_repair: "pending",
  decommissioned: "muted",
};

/** docs/PRD.md FR-7.1/FR-7.2 (Module 7) — admin manages equipment inventory. */
export function AdminEquipmentPage(): React.JSX.Element {
  const { data: equipment, isLoading } = useAllEquipment();
  const createEquipment = useCreateEquipment();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<EquipmentCategory>("projector");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl text-ink-navy">Equipment</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createEquipment.mutate({ name, category }, { onSuccess: () => setName("") });
        }}
        className="flex flex-wrap items-end gap-3 rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1"
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="font-body text-sm font-medium text-ink-navy">
            Category
          </label>
          <select
            id="category"
            className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy"
            value={category}
            onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" isLoading={createEquipment.isPending}>
          Add equipment
        </Button>
      </form>

      {isLoading ? (
        <p className="font-body text-sm text-slate">Loading equipment…</p>
      ) : (
        <div className="overflow-x-auto rounded-plaque border border-slate/15 bg-white shadow-level-1">
          <table className="w-full text-left font-body text-sm">
            <thead className="border-b border-slate/15 text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/10">
              {equipment?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-ink-navy">{item.name}</td>
                  <td className="px-4 py-2 text-slate">{item.category}</td>
                  <td className="px-4 py-2">
                    <StatusBadge label={item.status} tone={STATUS_TONE[item.status]} />
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
