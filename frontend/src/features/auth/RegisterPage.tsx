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
import type { Role } from "@/core/auth/types";
import { passwordMeetsAllRules } from "@/core/validation/password";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { OAuthButtons } from "@/features/auth/OAuthButtons";
import { ROLE_LABEL } from "@/routes/navigation";

const SELECTABLE_ROLES: Role[] = ["student", "faculty", "warden", "maintenance_staff", "admin"];

// Mirrors the backend Pydantic RegisterRequest shape and password validator
// exactly (backend/app/services/auth/schemas.py). `requested_role` never
// grants access by itself — the account's actual `role` always starts as
// Student (ADR-010); anything else picked here only records a pending
// request an admin must approve.
const schema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .refine(passwordMeetsAllRules, "Password doesn't meet all the requirements below"),
  department: z.string().optional(),
  requested_role: z.enum(["student", "faculty", "warden", "maintenance_staff", "admin"]),
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { requested_role: "student" },
  });

  const passwordValue = watch("password") ?? "";
  const requestedRoleValue = watch("requested_role");
  const requestsElevatedRole = requestedRoleValue !== "student";

  const onSubmit = async (values: FormValues): Promise<void> => {
    setFormError(null);
    try {
      await registerAccount(values);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 0 || err.code === "NETWORK_ERROR") {
          setFormError("Unable to connect to the backend server. Please check your connection.");
        } else if (err.status === 409 || err.code === "RESOURCE_CONFLICT") {
          setFormError("An account with this email already exists. Please sign in instead.");
        } else if (err.status >= 500) {
          setFormError("Unable to create your account right now. Please try again later.");
        } else {
          setFormError(err.message);
        }
      } else if (err instanceof Error) {
        if (err.message === "Network Error" || err.message.includes("Network Error")) {
          setFormError("Unable to connect to the backend server. Please check your connection.");
        } else {
          setFormError("Could not create your account. Please try again.");
        }
      } else {
        setFormError("Could not create your account. Try again.");
      }
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Choose your role below">
      <div className="mb-4 rounded-plaque border border-ink-navy/20 bg-ink-navy/5 px-3 py-2.5 text-xs text-text-secondary dark:border-brass/20 dark:bg-brass/5">
        Picking anything other than <strong className="text-text-primary">Student</strong> creates a{" "}
        <strong className="text-text-primary">request</strong> — you'll be signed up as a student
        immediately, and an administrator has to approve the request before your account actually
        gets that role. (The department field further down is your academic/work department, e.g.
        "Computer Science" — not your role.)
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
        <div className="flex flex-col gap-1">
          <label
            htmlFor="register-requested-role"
            className="font-body text-xs font-semibold tracking-wide uppercase text-text-secondary/90"
          >
            Role
          </label>
          <select
            id="register-requested-role"
            className="rounded-plaque border border-card-border bg-card-bg px-3.5 py-2 font-body text-sm text-text-primary transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 focus:border-ink-navy focus:outline-none focus:ring-4 focus:ring-ink-navy/15"
            {...register("requested_role")}
          >
            {SELECTABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
          {requestsElevatedRole && (
            <p className="mt-1 font-body text-xs text-brass">
              You'll start as a Student. An admin needs to approve this request before you get{" "}
              {ROLE_LABEL[requestedRoleValue]} access.
            </p>
          )}
        </div>
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
        <Link
          to="/login"
          className="font-semibold text-ink-navy hover:underline transition-colors duration-200"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
