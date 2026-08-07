import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useApproveBooking,
  usePendingBookings,
  useRejectBooking,
  useMyBookings,
} from "@/features/booking/api";
import { exportToCSV } from "@/utils/export";

export function AdminBookingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const { data: pendingBookings, isLoading: loadingPending } = usePendingBookings();
  const { data: allBookings, isLoading: loadingAll } = useMyBookings();
  
  const approveBooking = useApproveBooking();
  const rejectBooking = useRejectBooking();

  const handleExportBookings = () => {
    const listToExport = activeTab === "pending" ? pendingBookings : allBookings;
    if (!listToExport || listToExport.length === 0) return;

    const exportData = listToExport.map((b) => ({
      ID: b.id,
      "Room ID": b.room_id,
      "Requester ID": b.requester_id,
      "Start Time": new Date(b.start_time).toLocaleString(),
      "End Time": new Date(b.end_time).toLocaleString(),
      Status: b.status,
      Purpose: b.purpose || "N/A",
      "Repeat Rule": b.recurrence_type || "none",
      "Seat Number": b.seat_number || "Whole Room",
    }));

    exportToCSV(exportData, `campus_bookings_log_${activeTab}.csv`);
  };

  const currentBookings = activeTab === "pending" ? pendingBookings : allBookings;
  const isLoading = activeTab === "pending" ? loadingPending : loadingAll;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Reservation Management</h1>
          <p className="font-body text-xs text-slate mt-1">Approve classroom requests and audit booking transaction logs</p>
        </div>
        
        {currentBookings && currentBookings.length > 0 && (
          <Button onClick={handleExportBookings} variant="secondary" className="py-2.5 px-4 font-semibold text-xs self-stretch sm:self-auto">
            Export Booking Log CSV
          </Button>
        )}
      </div>

      {/* Tabs selector */}
      <div className="flex gap-2 border-b border-card-border pb-px">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 font-display text-sm font-semibold border-b-2 transition ${
            activeTab === "pending"
              ? "border-brass text-text-primary"
              : "border-transparent text-slate hover:text-text-primary"
          }`}
        >
          Pending Approvals ({pendingBookings?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 font-display text-sm font-semibold border-b-2 transition ${
            activeTab === "all"
              ? "border-brass text-text-primary"
              : "border-transparent text-slate hover:text-text-primary"
          }`}
        >
          All Bookings Master Log ({allBookings?.length || 0})
        </button>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-slate">Loading reservations log…</p>
      ) : !currentBookings || currentBookings.length === 0 ? (
        <div className="rounded-plaque border-2 border-dashed border-card-border bg-card-bg/50 px-6 py-10 text-center">
          <p className="font-body text-sm text-slate">
            {activeTab === "pending"
              ? "Nothing awaiting approval right now."
              : "No reservation bookings registered in the registry."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentBookings.map((booking) => (
            <div key={booking.id} className="rounded-plaque border border-card-border bg-card-bg hover:border-brass/30 transition">
              <PlaqueCard
                identifierLabel="Booking ID"
                identifier={booking.id.slice(0, 8)}
                title={new Date(booking.start_time).toLocaleString()}
                meta={
                  <div className="space-y-1">
                    <p className="text-xs">{booking.purpose || "No purpose provided"}</p>
                    <p className="text-[10px] text-slate uppercase tracking-wider">
                      {booking.seat_number ? `PC Seat #${booking.seat_number}` : "Whole Room reservation"}
                      {booking.recurrence_type !== "none" && ` • Repeats ${booking.recurrence_type}`}
                    </p>
                  </div>
                }
                status={
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge
                      label={booking.status}
                      tone={
                        booking.status === "confirmed"
                          ? "success"
                          : booking.status === "pending"
                            ? "pending"
                            : "muted"
                      }
                    />
                    
                    {booking.status === "pending" && activeTab === "pending" && (
                      <div className="flex gap-2 mt-1">
                        <Button
                          variant="secondary"
                          isLoading={approveBooking.isPending && approveBooking.variables === booking.id}
                          onClick={() => approveBooking.mutate(booking.id)}
                          className="py-1 px-3 text-xs bg-quad-green/10 hover:bg-quad-green/20 border-quad-green/20 text-quad-green"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          isLoading={rejectBooking.isPending && rejectBooking.variables === booking.id}
                          onClick={() => rejectBooking.mutate(booking.id)}
                          className="py-1 px-3 text-xs bg-brick/10 hover:bg-brick/20 border-brick/20 text-brick"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
