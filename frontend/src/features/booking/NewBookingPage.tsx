import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/core/api/types";
import { useBuildings } from "@/features/campus/api";
import { useAvailability, useCreateBooking, type AvailabilityParams } from "@/features/booking/api";

const schema = z
  .object({
    building_id: z.string().optional(),
    min_capacity: z.coerce.number().int().positive().optional(),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
  })
  .refine((v) => new Date(v.end_time) > new Date(v.start_time), {
    message: "End time must be after start time",
    path: ["end_time"],
  });

type FormValues = z.infer<typeof schema>;

/** docs/PRD.md FR-2.1-FR-2.5 — search classrooms by building/capacity/time slot,
 * create a booking, and surface the exact conflicting window on a 409
 * (docs/UI_UX.md §5.5, docs/prompts/frontend.md item 8).
 */
export function NewBookingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { data: buildings } = useBuildings();
  const [searchParams, setSearchParams] = useState<AvailabilityParams | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedRoomId, setBookedRoomId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const availability = useAvailability(searchParams);
  const createBooking = useCreateBooking();

  const onSearch = (values: FormValues): void => {
    setBookingError(null);
    setSearchParams({
      start_time: new Date(values.start_time).toISOString(),
      end_time: new Date(values.end_time).toISOString(),
      building_id: values.building_id || undefined,
      min_capacity: values.min_capacity,
      type: "classroom",
    });
  };

  const onBook = (roomId: string): void => {
    if (!searchParams) return;
    setBookingError(null);
    createBooking.mutate(
      {
        room_id: roomId,
        start_time: searchParams.start_time,
        end_time: searchParams.end_time,
      },
      {
        onSuccess: () => setBookedRoomId(roomId),
        onError: (err) => {
          if (err instanceof ApiError && err.code === "RESOURCE_CONFLICT") {
            const window = err.details.conflicting_window as [string, string] | undefined;
            setBookingError(
              window
                ? `That room was just booked for an overlapping window (${new Date(
                    window[0],
                  ).toLocaleString()} – ${new Date(window[1]).toLocaleString()}). Try another room or time.`
                : "That room was just booked for an overlapping window. Try another room or time.",
            );
          } else {
            setBookingError("Could not create the booking. Try again.");
          }
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Book a Classroom</h1>

      <form
        onSubmit={handleSubmit(onSearch)}
        noValidate
        className="grid grid-cols-1 gap-4 rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="building" className="font-body text-sm font-medium text-ink-navy">
            Building
          </label>
          <select
            id="building"
            className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy"
            {...register("building_id")}
          >
            <option value="">Any building</option>
            {buildings?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <TextField
          label="Min. capacity"
          type="number"
          min={1}
          error={errors.min_capacity?.message}
          {...register("min_capacity")}
        />
        <TextField
          label="Start time"
          type="datetime-local"
          error={errors.start_time?.message}
          {...register("start_time")}
        />
        <TextField
          label="End time"
          type="datetime-local"
          error={errors.end_time?.message}
          {...register("end_time")}
        />
        <Button type="submit" className="sm:col-span-2 lg:col-span-4">
          Search availability
        </Button>
      </form>

      {bookingError && (
        <div
          role="alert"
          className="rounded-plaque border border-brick/30 bg-brick/5 px-4 py-3 text-sm text-brick"
        >
          {bookingError}
        </div>
      )}

      {availability.isLoading && <p className="font-body text-sm text-slate">Searching…</p>}

      {availability.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availability.data.map((result) => (
            <PlaqueCard
              key={result.room.id}
              identifierLabel="Room"
              identifier={result.room.name}
              title={result.room.name}
              meta={`Capacity ${result.room.capacity}`}
              status={
                bookedRoomId === result.room.id ? (
                  <StatusBadge label="Booked" tone="success" />
                ) : result.available ? (
                  <Button
                    variant="secondary"
                    isLoading={createBooking.isPending}
                    onClick={() => onBook(result.room.id)}
                  >
                    Book
                  </Button>
                ) : (
                  <StatusBadge label="Unavailable" tone="muted" />
                )
              }
            />
          ))}
          {availability.data.length === 0 && (
            <p className="font-body text-sm text-slate">No rooms match this search.</p>
          )}
        </div>
      )}

      {bookedRoomId && (
        <Button variant="secondary" onClick={() => navigate("/bookings/mine")} className="w-fit">
          View my bookings
        </Button>
      )}
    </div>
  );
}
