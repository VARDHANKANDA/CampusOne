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
import {
  useAvailability,
  useCreateBooking,
  useRoomBookings,
  type AvailabilityParams,
} from "@/features/booking/api";

const schema = z
  .object({
    building_id: z.string().optional(),
    min_capacity: z.coerce.number().int().positive().optional(),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    purpose: z.string().min(1, "Purpose is required"),
    is_recurring: z.boolean().default(false),
    recurrence_type: z.enum(["none", "daily", "weekly"]).default("none"),
    recurrence_end_date: z.string().optional(),
  })
  .refine((v) => new Date(v.end_time) > new Date(v.start_time), {
    message: "End time must be after start time",
    path: ["end_time"],
  })
  .refine(
    (v) => {
      if (v.is_recurring && !v.recurrence_end_date) return false;
      return true;
    },
    {
      message: "Recurrence end date is required for repeating bookings",
      path: ["recurrence_end_date"],
    }
  );

type FormValues = z.infer<typeof schema>;

export function NewBookingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { data: buildings } = useBuildings();
  const [searchParams, setSearchParams] = useState<AvailabilityParams | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedRoomId, setBookedRoomId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_recurring: false,
      recurrence_type: "none",
    },
  });

  const isRecurring = watch("is_recurring");
  const selectedDateStr = watch("start_time")?.split("T")[0] || new Date().toISOString().split("T")[0];

  const availability = useAvailability(searchParams);
  const createBooking = useCreateBooking();

  // Load bookings for selected room's daily timeline
  const roomBookings = useRoomBookings(selectedRoomId);

  const onSearch = (values: FormValues): void => {
    setBookingError(null);
    setBookedRoomId(null);
    setSearchParams({
      start_time: new Date(values.start_time).toISOString(),
      end_time: new Date(values.end_time).toISOString(),
      building_id: values.building_id || undefined,
      min_capacity: values.min_capacity,
      type: "classroom",
    });
  };

  const onBook = (values: FormValues, roomId: string): void => {
    setBookingError(null);
    createBooking.mutate(
      {
        room_id: roomId,
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
        purpose: values.purpose,
        recurrence_type: values.is_recurring ? values.recurrence_type : "none",
        recurrence_end_date:
          values.is_recurring && values.recurrence_end_date
            ? new Date(values.recurrence_end_date).toISOString()
            : null,
      },
      {
        onSuccess: () => setBookedRoomId(roomId),
        onError: (err) => {
          if (err instanceof ApiError && err.code === "RESOURCE_CONFLICT") {
            const window = err.details.conflicting_window as [string, string] | undefined;
            setBookingError(
              window
                ? `Conflict detected: That room is booked for an overlapping window (${new Date(
                    window[0]
                  ).toLocaleTimeString()} – ${new Date(window[1]).toLocaleTimeString()}).`
                : "A schedule conflict exists for that room and time. Please check the calendar timeline."
            );
          } else {
            setBookingError(err instanceof Error ? err.message : "Could not create the booking.");
          }
        },
      }
    );
  };

  // Render Visual Timeline: 9 AM to 6 PM (9 slots)
  const renderVisualScheduler = () => {
    if (!selectedRoomId) return null;

    const hours = Array.from({ length: 9 }, (_, i) => i + 9); // [9..17] representing 9 AM to 5 PM
    const bookingsForDay = (roomBookings.data || []).filter((b) => {
      if (b.status === "cancelled" || b.status === "rejected") return false;
      const bDate = new Date(b.start_time).toISOString().split("T")[0];
      return bDate === selectedDateStr;
    });

    const isLoadingTimeline = roomBookings.isLoading;

    return (
      <div className="rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1 space-y-4">
        <div className="flex justify-between items-center border-b border-card-border pb-3">
          <h3 className="font-display text-base font-semibold text-text-primary">
            Hourly Occupancy: {selectedRoomName}
          </h3>
          <span className="font-mono text-xs text-slate">{selectedDateStr}</span>
        </div>

        {isLoadingTimeline ? (
          <div className="h-20 animate-pulse bg-slate/10 rounded-plaque" />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
            {hours.map((hour) => {
              const startHourDate = new Date(selectedDateStr);
              startHourDate.setHours(hour, 0, 0, 0);
              const endHourDate = new Date(selectedDateStr);
              endHourDate.setHours(hour + 1, 0, 0, 0);

              // Check if any booking overlaps with this hour
              const isOccupied = bookingsForDay.some((b) => {
                const bStart = new Date(b.start_time);
                const bEnd = new Date(b.end_time);
                return bStart < endHourDate && bEnd > startHourDate;
              });

              return (
                <button
                  key={hour}
                  type="button"
                  disabled={isOccupied}
                  onClick={() => {
                    const localStart = `${selectedDateStr}T${hour.toString().padStart(2, "0")}:00`;
                    const localEnd = `${selectedDateStr}T${(hour + 1).toString().padStart(2, "0")}:00`;
                    setValue("start_time", localStart);
                    setValue("end_time", localEnd);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-plaque text-xs transition border ${
                    isOccupied
                      ? "bg-slate/15 border-card-border text-slate cursor-not-allowed"
                      : "bg-quad-green/10 border-quad-green/30 text-quad-green hover:bg-quad-green/20 hover:scale-[1.03] active:scale-[0.98]"
                  }`}
                >
                  <span className="font-mono font-bold">{hour}:00</span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold mt-1">
                    {isOccupied ? "Booked" : "Vacant"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-slate italic">
          * Green slots are vacant. Click a slot to auto-fill the reservation times in the form.
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Book a Classroom</h1>
        <p className="font-body text-xs text-slate mt-1">Schedule lecture halls and review vacancy timelines</p>
      </div>

      {/* Main Form & Timeline layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Search & Parameter Form */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleSubmit(onSearch)}
            noValidate
            className="flex flex-col gap-4 rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1"
          >
            <h2 className="font-body text-xs font-bold uppercase tracking-widest text-slate border-b border-card-border pb-2 mb-1">
              Search Parameters
            </h2>

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
              label="Minimum Student Capacity"
              type="number"
              min={1}
              error={errors.min_capacity?.message}
              {...register("min_capacity")}
            />

            <TextField
              label="Reservation Title / Purpose"
              type="text"
              placeholder="e.g. CS101 Lecture, Seminar"
              error={errors.purpose?.message}
              {...register("purpose")}
            />

            <TextField
              label="Start Date & Time"
              type="datetime-local"
              error={errors.start_time?.message}
              {...register("start_time")}
            />

            <TextField
              label="End Date & Time"
              type="datetime-local"
              error={errors.end_time?.message}
              {...register("end_time")}
            />

            {/* Recurrence Toggles */}
            <div className="border-t border-card-border pt-3 mt-1 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-card-border text-brass focus:ring-brass h-4 w-4"
                  {...register("is_recurring")}
                />
                <span className="font-body text-xs font-semibold text-text-primary">
                  Repeat this booking
                </span>
              </label>

              {isRecurring && (
                <div className="pl-6 space-y-3 animate-in slide-in-from-top-2 duration-150">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="recurrence_type" className="font-body text-xs font-semibold text-text-primary">
                      Repeat Frequency
                    </label>
                    <select
                      id="recurrence_type"
                      className="rounded-plaque border border-card-border bg-canvas px-3 py-2 font-body text-sm text-text-primary outline-none focus:ring-2 focus:ring-brass"
                      {...register("recurrence_type")}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <TextField
                    label="Repeat Until Date"
                    type="date"
                    error={errors.recurrence_end_date?.message}
                    {...register("recurrence_end_date")}
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="mt-2 py-2.5">
              Verify Availability
            </Button>
          </form>
        </div>

        {/* Right 2 Columns: Occupancy Timelines & Search Results */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Visual Occupancy Timeline Component */}
          {selectedRoomId && renderVisualScheduler()}

          {/* Conflict Display Alert */}
          {bookingError && (
            <div
              role="alert"
              className="rounded-plaque border border-brick/35 bg-brick/5 p-4 text-xs font-medium text-brick animate-in fade-in"
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Collision Warning</span>
              </div>
              {bookingError}
            </div>
          )}

          {/* Availability Results Grid */}
          {availability.isLoading && (
            <div className="p-12 text-center font-body text-sm text-slate">
              Searching campus room registries...
            </div>
          )}

          {availability.data && (
            <div className="space-y-4">
              <h2 className="font-body text-xs font-bold uppercase tracking-widest text-slate">
                Vacant Rooms Grid
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {availability.data.map((result) => {
                  const isBooked = bookedRoomId === result.room.id;
                  const isSelected = selectedRoomId === result.room.id;

                  return (
                    <div
                      key={result.room.id}
                      onClick={() => {
                        setSelectedRoomId(result.room.id);
                        setSelectedRoomName(result.room.name);
                      }}
                      className={`cursor-pointer rounded-plaque transition border ${
                        isSelected
                          ? "border-brass bg-brass/5"
                          : "border-card-border hover:border-brass/50 bg-card-bg"
                      }`}
                    >
                      <PlaqueCard
                        identifierLabel="Capacity"
                        identifier={`${result.room.capacity} seats`}
                        title={result.room.name}
                        meta={
                          <div className="space-y-1">
                            <p className="text-xs">Building: {result.room.building?.name || "Main campus"}</p>
                            <p className="text-[10px] text-slate uppercase tracking-wider">
                              Tags: {result.room.equipment_tags.join(", ") || "None"}
                            </p>
                          </div>
                        }
                        status={
                          isBooked ? (
                            <StatusBadge label="Reserved" tone="success" />
                          ) : result.available ? (
                            <Button
                              isLoading={createBooking.isPending && isSelected}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmit((values) => onBook(values, result.room.id))();
                              }}
                              className="py-1 px-3.5 text-xs bg-quad-green hover:bg-quad-green/90 text-white"
                            >
                              Reserve Room
                            </Button>
                          ) : (
                            <StatusBadge label="Occupied" tone="muted" />
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>

              {/* Recommendations Section */}
              {availability.data.some((r) => !r.available) && (
                <div className="border-t border-card-border pt-4 mt-6">
                  <h3 className="font-display text-sm font-semibold text-text-primary mb-3">
                    Conflict Recommendations: Alternative Vacant Rooms
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {availability.data
                      .filter((r) => r.available)
                      .slice(0, 2)
                      .map((alt) => (
                        <div
                          key={alt.room.id}
                          className="p-3 border border-card-border rounded-plaque bg-card-bg/60 flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-xs text-text-primary block">{alt.room.name}</span>
                            <span className="text-[10px] text-slate">Capacity: {alt.room.capacity} seats</span>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedRoomId(alt.room.id);
                              setSelectedRoomName(alt.room.name);
                              handleSubmit((values) => onBook(values, alt.room.id))();
                            }}
                            className="py-1 px-2.5 text-[10px]"
                          >
                            Book Alt
                          </Button>
                        </div>
                      ))}
                    {availability.data.filter((r) => r.available).length === 0 && (
                      <p className="text-xs text-slate">No alternate rooms available for this capacity or time slot.</p>
                    )}
                  </div>
                </div>
              )}

              {availability.data.length === 0 && (
                <div className="rounded-plaque border border-card-border bg-card-bg/50 p-8 text-center text-xs text-slate">
                  No rooms matching the search criteria were found in the database.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
