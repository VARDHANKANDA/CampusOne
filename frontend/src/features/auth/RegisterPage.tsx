import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { PasswordStrengthMeter } from "@/components/ui/PasswordStrengthMeter";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/core/auth/useAuth";
import { ApiError } from "@/core/api/types";
import { passwordMeetsAllRules } from "@/core/validation/password";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { OAuthButtons } from "@/features/auth/OAuthButtons";

// Mirrors the backend Pydantic RegisterRequest shape and password validator
// exactly (backend/app/services/auth/schemas.py) — no role field, since
// self-registration always creates a student account (ADR-010); every other
// role is admin-provisioned.
const schema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .refine(passwordMeetsAllRules, "Password doesn't meet all the requirements below"),
  department: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage(): React.JSX.Element {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const passwordValue = watch("password") ?? "";

  const onSubmit = async (values: FormValues): Promise<void> => {
    setFormError(null);
    try {
      await registerAccount(values);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not create your account. Try again.",
      );
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Registers as a student account">
      <div className="mb-4 rounded-plaque border border-ink-navy/20 bg-ink-navy/5 px-3 py-2.5 text-xs text-text-secondary dark:border-brass/20 dark:bg-brass/5">
        This form always creates a <strong className="text-text-primary">Student</strong> account — there's
        no way to pick a different role here. If you need Faculty, Hostel Warden, Maintenance
        Staff, or Admin access, sign up as a student first and ask your administrator to update
        your role afterward from the Admin panel. (The field below is your academic/work{" "}
        <strong className="text-text-primary">department</strong>, e.g. "Computer Science" — not
        your role.)
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-plaque border border-brick/30 bg-brick/5 px-3 py-2 text-sm text-brick"
          >
            {formError}
          </div>
        )}
        <TextField
          label="Full name"
          autoComplete="name"
          error={errors.full_name?.message}
          {...register("full_name")}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordStrengthMeter password={passwordValue} />
        <TextField
          label="Department (optional)"
          placeholder="e.g. Computer Science — not your role"
          error={errors.department?.message}
          {...register("department")}
        />
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Create account
        </Button>
      </form>
      <div className="mt-6">
        <OAuthButtons />
      </div>
      <p className="mt-6 font-body text-sm text-text-secondary">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-ink-navy hover:underline transition-colors duration-200">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
