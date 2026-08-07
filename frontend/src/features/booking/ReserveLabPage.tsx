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
import { useJoinWaitlist, useLabAvailability, useReserveLab, useOccupiedSeats } from "@/features/booking/labsApi";
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

export function ReserveLabPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { data: buildings } = useBuildings();
  const [searchParams, setSearchParams] = useState<Omit<AvailabilityParams, "type"> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reservedRoomId, setReservedRoomId] = useState<string | null>(null);
  const [waitlistedRoomId, setWaitlistedRoomId] = useState<string | null>(null);

  // Seat selection states
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const availability = useLabAvailability(searchParams);
  const reserveLab = useReserveLab();
  const joinWaitlist = useJoinWaitlist();

  // Fetch occupied seats for the selected lab room during the searched window
  const occupiedSeats = useOccupiedSeats(
    selectedRoomId,
    searchParams?.start_time || null,
    searchParams?.end_time || null
  );

  const onSearch = (values: FormValues): void => {
    setActionError(null);
    setReservedRoomId(null);
    setWaitlistedRoomId(null);
    setSelectedRoomId(null);
    setSelectedSeat(null);
    setSearchParams({
      start_time: new Date(values.start_time).toISOString(),
      end_time: new Date(values.end_time).toISOString(),
      building_id: values.building_id || undefined,
    });
  };

  const onReserve = (roomId: string): void => {
    if (!searchParams) return;
    if (selectedSeat === null) {
      setActionError("Please select a PC terminal seat to reserve.");
      return;
    }
    setActionError(null);
    reserveLab.mutate(
      {
        room_id: roomId,
        start_time: searchParams.start_time,
        end_time: searchParams.end_time,
        seat_number: selectedSeat,
      },
      {
        onSuccess: () => setReservedRoomId(roomId),
        onError: (err) => {
          setActionError(err instanceof ApiError ? err.message : "Could not reserve this lab. Try again.");
        },
      }
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
            err instanceof ApiError ? err.message : "Could not join the waitlist. Try again."
          );
        },
      }
    );
  };

  // Render a visual map of 20 computer stations
  const renderLabSeatLayout = () => {
    if (!selectedRoomId) return null;

    const seats = Array.from({ length: 20 }, (_, i) => i + 1); // 20 PC terminals
    const occupiedList = occupiedSeats.data || [];
    const isLoadingSeats = occupiedSeats.isLoading;

    return (
      <div className="rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1 space-y-4">
        <div className="flex justify-between items-center border-b border-card-border pb-3">
          <div>
            <h3 className="font-display text-base font-semibold text-text-primary">
              PC Terminal Selection: {selectedRoomName}
            </h3>
            <p className="text-xs text-slate mt-0.5">Select an available PC terminal station below</p>
          </div>
          <span className="rounded bg-canvas px-2.5 py-1 text-[10px] uppercase font-bold text-slate">
            {20 - occupiedList.length} / 20 Available
          </span>
        </div>

        {isLoadingSeats ? (
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse bg-slate/10 rounded-plaque" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {seats.map((seatNum) => {
              const isOccupied = occupiedList.includes(seatNum);
              const isSelected = selectedSeat === seatNum;

              return (
                <button
                  key={seatNum}
                  type="button"
                  disabled={isOccupied}
                  onClick={() => setSelectedSeat(seatNum)}
                  className={`flex flex-col items-center justify-center p-3 rounded-plaque text-xs transition border ${
                    isOccupied
                      ? "bg-brick/10 border-brick/20 text-brick/70 cursor-not-allowed"
                      : isSelected
                        ? "bg-brass/20 border-brass text-ink-navy dark:text-brass-light font-bold"
                        : "bg-quad-green/10 border-quad-green/30 text-quad-green hover:bg-quad-green/20 hover:scale-[1.03] active:scale-[0.98]"
                  }`}
                >
                  <svg className="h-4 w-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-mono text-[10px]">PC #{seatNum}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-4 text-[10px] text-slate pt-2 border-t border-card-border">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-quad-green" />
            <span>Vacant Terminal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brick" />
            <span>Occupied / Reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brass" />
            <span>Selected Station</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Reserve a Laboratory Station</h1>
        <p className="font-body text-xs text-slate mt-1">Book computer terminals and lab setups with waiting lists</p>
      </div>

      <form
        onSubmit={handleSubmit(onSearch)}
        noValidate
        className="grid grid-cols-1 gap-4 rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="building" className="font-body text-xs font-semibold text-text-primary">
            Building Location
          </label>
          <select
            id="building"
            className="rounded-plaque border border-card-border bg-canvas px-3 py-2 font-body text-sm text-text-primary outline-none focus:ring-2 focus:ring-brass"
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
          label="Start Time slot"
          type="datetime-local"
          error={errors.start_time?.message}
          {...register("start_time")}
        />
        <TextField
          label="End Time slot"
          type="datetime-local"
          error={errors.end_time?.message}
          {...register("end_time")}
        />
        <Button type="submit" className="self-end py-2.5">
          Find Available Labs
        </Button>
      </form>

      {actionError && (
        <div
          role="alert"
          className="rounded-plaque border border-brick/35 bg-brick/5 p-4 text-xs font-medium text-brick animate-in fade-in"
        >
          {actionError}
        </div>
      )}

      {/* Main split grid: Lab cards on left, seat layout on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lab List (Left 2 columns or full width) */}
        <div className={selectedRoomId ? "lg:col-span-1 space-y-4" : "lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4"}>
          {availability.data && availability.data.map((result) => {
            const isReserved = reservedRoomId === result.room.id;
            const isWaitlisted = waitlistedRoomId === result.room.id;
            const isSelected = selectedRoomId === result.room.id;

            return (
              <div
                key={result.room.id}
                onClick={() => {
                  setSelectedRoomId(result.room.id);
                  setSelectedRoomName(result.room.name);
                  setSelectedSeat(null);
                }}
                className={`cursor-pointer rounded-plaque transition border ${
                  isSelected
                    ? "border-brass bg-brass/5"
                    : "border-card-border hover:border-brass/50 bg-card-bg"
                }`}
              >
                <PlaqueCard
                  identifierLabel="Lab Room"
                  identifier={result.room.name}
                  title={result.room.name}
                  meta={
                    <div className="space-y-1">
                      <p className="text-xs">Capacity: {result.room.capacity} seats</p>
                      <p className="text-[10px] text-slate uppercase tracking-wider">
                        Building: {result.room.building?.name || "Main campus"}
                      </p>
                    </div>
                  }
                  status={
                    isReserved ? (
                      <StatusBadge label="Reserved" tone="success" />
                    ) : isWaitlisted ? (
                      <StatusBadge label="Waitlisted" tone="pending" />
                    ) : result.available ? (
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoomId(result.room.id);
                          setSelectedRoomName(result.room.name);
                        }}
                        className="py-1 px-3 text-xs"
                      >
                        Select Seat
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        isLoading={joinWaitlist.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          onJoinWaitlist(result.room.id);
                        }}
                        className="py-1 px-3 text-xs border-slate/30 text-slate"
                      >
                        Join Waitlist
                      </Button>
                    )
                  }
                />
              </div>
            );
          })}

          {availability.data && availability.data.length === 0 && (
            <div className="col-span-3 rounded-plaque border border-card-border bg-card-bg/50 p-8 text-center text-xs text-slate">
              No labs matching the search criteria were found in the database.
            </div>
          )}
        </div>

        {/* Seat Layout Map (Right column) */}
        {selectedRoomId && (
          <div className="lg:col-span-2 space-y-4 animate-in slide-in-from-right-3 duration-200">
            {renderLabSeatLayout()}
            
            {selectedSeat !== null && (
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  onClick={() => setSelectedRoomId(null)}
                  variant="secondary"
                  className="py-2"
                >
                  Cancel
                </Button>
                <Button
                  isLoading={reserveLab.isPending}
                  onClick={() => onReserve(selectedRoomId)}
                  className="py-2 px-6 bg-quad-green hover:bg-quad-green/90 text-white font-bold"
                >
                  Confirm PC #{selectedSeat} Reservation
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {(reservedRoomId || waitlistedRoomId) && (
        <Button variant="secondary" onClick={() => navigate("/bookings/mine")} className="w-fit py-2 px-4 mt-2">
          View my bookings list
        </Button>
      )}
    </div>
  );
}
