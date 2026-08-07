import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/core/api/types";
import { useRooms } from "@/features/campus/api";
import { useCreateEvent } from "@/features/event/api";

const schema = z
  .object({
    room_id: z.string().min(1, "Select a venue"),
    title: z.string().min(1, "Title is required").max(200),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
  })
  .refine((v) => new Date(v.end_time) > new Date(v.start_time), {
    message: "End time must be after start time",
    path: ["end_time"],
  });

type FormValues = z.infer<typeof schema>;

/** docs/PRD.md FR-5.1/FR-5.2 — schedule an event in an auditorium/seminar hall,
 * server-side conflict validation surfaces a specific 409 (docs/UI_UX.md §5.5).
 */
export function ScheduleEventPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { data: auditoriums } = useRooms({ type: "auditorium" });
  const { data: seminarHalls } = useRooms({ type: "seminar_hall" });
  const venues = [...(auditoriums ?? []), ...(seminarHalls ?? [])];

  const [submitError, setSubmitError] = useState<string | null>(null);
  const createEvent = useCreateEvent();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues): void => {
    setSubmitError(null);
    createEvent.mutate(
      {
        room_id: values.room_id,
        title: values.title,
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
      },
      {
        onSuccess: () => navigate("/"),
        onError: (err) => {
          setSubmitError(
            err instanceof ApiError ? err.message : "Could not schedule the event. Try again.",
          );
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-ink-navy">Schedule Event</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
        {submitError && (
          <div
            role="alert"
            className="rounded-plaque border border-brick/30 bg-brick/5 px-3 py-2 text-sm text-brick"
          >
            {submitError}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="room" className="font-body text-sm font-medium text-ink-navy">
            Venue
          </label>
          <select
            id="room"
            className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy"
            {...register("room_id")}
          >
            <option value="">Select a venue…</option>
            {venues.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} (capacity {room.capacity})
              </option>
            ))}
          </select>
          {errors.room_id && (
            <p className="font-body text-sm text-brick">{errors.room_id.message}</p>
          )}
        </div>
        <TextField label="Title" error={errors.title?.message} {...register("title")} />
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
        <Button type="submit" isLoading={createEvent.isPending} className="mt-2">
          Schedule Event
        </Button>
      </form>
    </div>
  );
}
