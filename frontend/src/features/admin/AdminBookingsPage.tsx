import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { useApproveBooking, usePendingBookings, useRejectBooking } from "@/features/booking/api";

/** docs/PRD.md FR-2.6/FR-14.3 — approve/reject bookings for rooms flagged
 * `requires_approval` (docs/DECISIONS.md ADR-012).
 */
export function AdminBookingsPage(): React.JSX.Element {
  const { data: bookings, isLoading } = usePendingBookings();
  const approveBooking = useApproveBooking();
  const rejectBooking = useRejectBooking();

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading pending bookings…</p>;
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
        <p className="font-body text-sm text-slate">Nothing awaiting approval right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Bookings (Approvals)</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bookings.map((booking) => (
          <PlaqueCard
            key={booking.id}
            identifierLabel="Booking"
            identifier={booking.id.slice(0, 8)}
            title={new Date(booking.start_time).toLocaleString()}
            meta={booking.purpose ?? undefined}
            status={
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  isLoading={approveBooking.isPending && approveBooking.variables === booking.id}
                  onClick={() => approveBooking.mutate(booking.id)}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  isLoading={rejectBooking.isPending && rejectBooking.variables === booking.id}
                  onClick={() => rejectBooking.mutate(booking.id)}
                >
                  Reject
                </Button>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
