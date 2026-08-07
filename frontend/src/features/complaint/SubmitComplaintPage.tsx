import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useSubmitComplaint } from "@/features/complaint/api";

const CATEGORIES = ["plumbing", "electrical", "network", "furniture", "other"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

const schema = z.object({
  category: z.enum(CATEGORIES),
  description: z.string().min(1, "Description is required").max(2000),
  priority: z.enum(PRIORITIES),
  image: z.instanceof(FileList).refine((files) => files.length === 1, "A photo is required"),
});

type FormValues = z.infer<typeof schema>;

/** docs/PRD.md FR-4.1 — submit a complaint with category, description, image,
 * priority. Multi-step-feeling single form kept intentionally short (docs/UI_UX.md §5.4).
 */
export function SubmitComplaintPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitComplaint = useSubmitComplaint();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues): void => {
    setSubmitError(null);
    submitComplaint.mutate(
      {
        category: values.category,
        description: values.description,
        priority: values.priority,
        image: values.image[0],
      },
      {
        onSuccess: () => navigate("/complaints/mine"),
        onError: () => setSubmitError("Could not submit your complaint. Try again."),
      },
    );
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl text-ink-navy">Submit a Complaint</h1>

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
          <label htmlFor="category" className="font-body text-sm font-medium text-ink-navy">
            Category
          </label>
          <select
            id="category"
            className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy"
            {...register("category")}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="font-body text-sm font-medium text-ink-navy">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy shadow-[inset_0_1px_2px_rgba(27,42,74,0.08)]"
            {...register("description")}
          />
          {errors.description && (
            <p className="font-body text-sm text-brick">{errors.description.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="priority" className="font-body text-sm font-medium text-ink-navy">
            Priority
          </label>
          <select
            id="priority"
            className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy"
            {...register("priority")}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <TextField
          label="Photo"
          type="file"
          accept="image/*"
          error={errors.image?.message as string | undefined}
          {...register("image")}
        />

        <Button type="submit" isLoading={submitComplaint.isPending} className="mt-2">
          Submit Complaint
        </Button>
      </form>
    </div>
  );
}
