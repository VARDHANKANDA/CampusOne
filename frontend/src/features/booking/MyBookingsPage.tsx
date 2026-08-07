import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCancelBooking, useMyBookings } from "@/features/booking/api";
import { BOOKING_STATUS_TONE } from "@/features/booking/statusTone";

/** docs/PRD.md FR-2.4 — booking history; FR-2.3 — cancel own booking. Empty
 * state per docs/UI_UX.md §9.
 */
export function MyBookingsPage(): React.JSX.Element {
  const { data: bookings, isLoading } = useMyBookings();
  const cancelBooking = useCancelBooking();

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading your bookings…</p>;
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
        <p className="font-body text-sm text-slate">
          No bookings yet — book a classroom to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">My Bookings</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bookings.map((booking) => (
          <PlaqueCard
            key={booking.id}
            identifierLabel="Booking"
            identifier={booking.id.slice(0, 8)}
            title={new Date(booking.start_time).toLocaleDateString()}
            meta={`${new Date(booking.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(
              booking.end_time,
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            status={
              <div className="flex items-center gap-2">
                <StatusBadge label={booking.status} tone={BOOKING_STATUS_TONE[booking.status]} />
                {(booking.status === "pending" || booking.status === "confirmed") && (
                  <Button
                    variant="secondary"
                    isLoading={cancelBooking.isPending && cancelBooking.variables === booking.id}
                    onClick={() => cancelBooking.mutate(booking.id)}
                  >
                    Cancel
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
