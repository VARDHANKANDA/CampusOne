import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { useAllEquipment, useCreateEquipment } from "@/features/equipment/api";
import type { Equipment, EquipmentCategory, EquipmentStatus } from "@/features/equipment/types";
import { useBuildings } from "@/features/campus/api";

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

export function AdminEquipmentPage(): React.JSX.Element {
  const { data: equipment, isLoading } = useAllEquipment();
  const { data: buildings } = useBuildings();
  const createEquipment = useCreateEquipment();

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState<EquipmentCategory>("projector");
  const [buildingId, setBuildingId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");

  // Modal / Print states
  const [activePrintItem, setActivePrintItem] = useState<Equipment | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEquipment.mutate(
      {
        name,
        category,
        building_id: buildingId || null,
        purchase_date: purchaseDate || null,
        warranty_expiry: warrantyExpiry || null,
      },
      {
        onSuccess: () => {
          setName("");
          setBuildingId("");
          setPurchaseDate("");
          setWarrantyExpiry("");
        },
      }
    );
  };

  // Calculate expiring warranties (expiring within 30 days)
  const getWarrantyAlerts = () => {
    if (!equipment) return [];
    const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return equipment.filter((item) => {
      if (!item.warranty_expiry) return false;
      const expiryTime = new Date(item.warranty_expiry).getTime();
      return expiryTime > Date.now() && expiryTime <= thirtyDaysFromNow;
    });
  };

  const expiringItems = getWarrantyAlerts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Equipment Inventory Register</h1>
        <p className="font-body text-xs text-slate mt-1">Audit physical assets, generate asset tag QR labels, and monitor warranties</p>
      </div>

      {/* Warranty Expiry Alerts Board */}
      {expiringItems.length > 0 && (
        <div className="rounded-plaque border border-brick/35 bg-brick/5 p-4 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-xs text-brick">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Expiring Warranty Alert</span>
          </div>
          <p className="text-xs text-slate">
            The following assets have warranties expiring in the next 30 days. Please verify if renewal is required:
          </p>
          <ul className="list-disc pl-5 text-xs text-text-primary space-y-1">
            {expiringItems.map((item) => (
              <li key={item.id}>
                <span className="font-bold">{item.name}</span> (Expiry: {item.warranty_expiry})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Asset Form Panel */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1"
      >
        <h2 className="font-body text-xs font-bold uppercase tracking-widest text-slate border-b border-card-border pb-2 mb-1">
          Register Asset Entry
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <TextField
            label="Asset Description / Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Epson 4K Projector"
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="category" className="font-body text-xs font-semibold text-text-primary">
              Category
            </label>
            <select
              id="category"
              className="rounded-plaque border border-card-border bg-canvas px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:ring-2 focus:ring-brass"
              value={category}
              onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="building" className="font-body text-xs font-semibold text-text-primary">
              Location Block
            </label>
            <select
              id="building"
              className="rounded-plaque border border-card-border bg-canvas px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:ring-2 focus:ring-brass"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
            >
              <option value="">Select location...</option>
              {buildings?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label="Purchase Date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />

          <TextField
            label="Warranty Expiration"
            type="date"
            value={warrantyExpiry}
            onChange={(e) => setWarrantyExpiry(e.target.value)}
          />
        </div>

        <Button type="submit" isLoading={createEquipment.isPending} className="w-fit py-2 px-5 mt-1">
          Add Equipment Entry
        </Button>
      </form>

      {/* Inventory Table List */}
      {isLoading ? (
        <p className="font-body text-sm text-slate">Loading equipment directory…</p>
      ) : (
        <div className="overflow-x-auto rounded-plaque border border-card-border bg-card-bg shadow-level-1">
          <table className="w-full text-left font-body text-sm border-collapse">
            <thead className="border-b border-card-border bg-canvas/40 text-[10px] uppercase font-bold tracking-wider text-slate">
              <tr>
                <th className="px-5 py-3">Asset Description</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Purchase Date</th>
                <th className="px-5 py-3">Warranty Expiration</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {equipment?.map((item) => (
                <tr key={item.id} className="hover:bg-canvas/10 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-text-primary">{item.name}</td>
                  <td className="px-5 py-3.5 text-slate capitalize">{item.category.replace("_", " ")}</td>
                  <td className="px-5 py-3.5 text-slate font-mono">{item.purchase_date || "—"}</td>
                  <td className="px-5 py-3.5 text-slate font-mono">{item.warranty_expiry || "—"}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge label={item.status} tone={STATUS_TONE[item.status]} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="secondary"
                      onClick={() => setActivePrintItem(item)}
                      className="py-1 px-3 text-xs"
                    >
                      Print QR Label
                    </Button>
                  </td>
                </tr>
              ))}
              {(!equipment || equipment.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate">
                    No equipment registered in the inventory ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Label Print Dialog Modal */}
      {activePrintItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 print:bg-white print:p-0">
          <div className="w-full max-w-sm bg-card-bg border border-card-border rounded-plaque p-6 shadow-level-3 space-y-5 animate-in zoom-in-95 duration-150 print:border-0 print:shadow-none print:w-full print:max-w-none print:p-0">
            
            {/* Header (hides when printing) */}
            <div className="flex justify-between items-center border-b border-card-border pb-3 print:hidden">
              <h3 className="font-display text-base font-bold text-text-primary">Print Asset Tag Label</h3>
              <button
                onClick={() => setActivePrintItem(null)}
                className="text-slate hover:text-text-primary transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Printable Label Layout */}
            <div className="flex flex-col items-center text-center p-6 border-2 border-dashed border-slate/30 rounded-plaque bg-canvas/30 space-y-4 print:border-2 print:border-solid print:border-black print:rounded-none print:p-8 print:my-10 print:mx-auto print:max-w-xs">
              <div className="font-display text-[10px] font-bold tracking-widest text-slate print:text-black uppercase">
                Smart Campus Property Tag
              </div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${activePrintItem.id}`}
                alt="Asset QR Barcode Label"
                className="h-36 w-36 border border-card-border bg-white p-2"
              />
              <div className="space-y-1">
                <span className="block font-display text-sm font-bold text-text-primary print:text-black">
                  {activePrintItem.name}
                </span>
                <span className="block font-mono text-[10px] text-slate print:text-black font-semibold">
                  ASSET ID: {activePrintItem.id.toUpperCase()}
                </span>
                <span className="inline-block px-2 py-0.5 rounded bg-slate/10 text-[9px] uppercase font-mono text-slate print:border print:border-black print:text-black mt-1">
                  Category: {activePrintItem.category.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Actions (hides when printing) */}
            <div className="flex justify-end gap-3 pt-3 border-t border-card-border print:hidden">
              <Button
                variant="secondary"
                onClick={() => setActivePrintItem(null)}
                className="py-2"
              >
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                className="py-2 px-5 bg-brass text-white font-bold"
              >
                Print Label Tag
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
