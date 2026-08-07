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
import type { AvailabilityParams } from "@/features/booking/api";
import { useJoinWaitlist, useLabAvailability, useReserveLab } from "@/features/booking/labsApi";
import { useBuildings } from "@/features/campus/api";

const schema = z
  .object({
    building_id: z.string().optional(),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
  })
  .refine((v) => new Date(v.end_time) > new Date(v.start_time), {
    message: "End time must be after start time",
    path: ["end_time"],
  });

type FormValues = z.infer<typeof schema>;

/** docs/PRD.md FR-3.1-FR-3.3 — search lab availability, reserve a session, or
 * join the waitlist for a taken slot.
 */
export function ReserveLabPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { data: buildings } = useBuildings();
  const [searchParams, setSearchParams] = useState<Omit<AvailabilityParams, "type"> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reservedRoomId, setReservedRoomId] = useState<string | null>(null);
  const [waitlistedRoomId, setWaitlistedRoomId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const availability = useLabAvailability(searchParams);
  const reserveLab = useReserveLab();
  const joinWaitlist = useJoinWaitlist();

  const onSearch = (values: FormValues): void => {
    setActionError(null);
    setSearchParams({
      start_time: new Date(values.start_time).toISOString(),
      end_time: new Date(values.end_time).toISOString(),
      building_id: values.building_id || undefined,
    });
  };

  const onReserve = (roomId: string): void => {
    if (!searchParams) return;
    setActionError(null);
    reserveLab.mutate(
      { room_id: roomId, start_time: searchParams.start_time, end_time: searchParams.end_time },
      {
        onSuccess: () => setReservedRoomId(roomId),
        onError: () => setActionError("Could not reserve this lab. Try again."),
      },
    );
  };

  const onJoinWaitlist = (roomId: string): void => {
    if (!searchParams) return;
    setActionError(null);
    joinWaitlist.mutate(
      { room_id: roomId, start_time: searchParams.start_time, end_time: searchParams.end_time },
      {
        onSuccess: () => setWaitlistedRoomId(roomId),
        onError: (err) => {
          setActionError(
            err instanceof ApiError ? err.message : "Could not join the waitlist. Try again.",
          );
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Reserve a Lab</h1>

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
        <Button type="submit" className="self-end">
          Search availability
        </Button>
      </form>

      {actionError && (
        <div
          role="alert"
          className="rounded-plaque border border-brick/30 bg-brick/5 px-4 py-3 text-sm text-brick"
        >
          {actionError}
        </div>
      )}

      {availability.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availability.data.map((result) => (
            <PlaqueCard
              key={result.room.id}
              identifierLabel="Lab"
              identifier={result.room.name}
              title={result.room.name}
              meta={`Capacity ${result.room.capacity}`}
              status={
                reservedRoomId === result.room.id ? (
                  <StatusBadge label="Reserved" tone="success" />
                ) : waitlistedRoomId === result.room.id ? (
                  <StatusBadge label="Waitlisted" tone="pending" />
                ) : result.available ? (
                  <Button
                    variant="secondary"
                    isLoading={reserveLab.isPending}
                    onClick={() => onReserve(result.room.id)}
                  >
                    Reserve
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    isLoading={joinWaitlist.isPending}
                    onClick={() => onJoinWaitlist(result.room.id)}
                  >
                    Join waitlist
                  </Button>
                )
              }
            />
          ))}
          {availability.data.length === 0 && (
            <p className="font-body text-sm text-slate">No labs match this search.</p>
          )}
        </div>
      )}

      {(reservedRoomId || waitlistedRoomId) && (
        <Button variant="secondary" onClick={() => navigate("/bookings/mine")} className="w-fit">
          View my bookings
        </Button>
      )}
    </div>
  );
}
