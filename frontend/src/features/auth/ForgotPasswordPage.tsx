import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { apiClient } from "@/core/api/client";
import { AuthLayout } from "@/features/auth/AuthLayout";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage(): React.JSX.Element {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues): Promise<void> => {
    // Backend always returns a generic success response, regardless of whether
    // the address is registered (docs/SECURITY.md §1 — no user enumeration).
    await apiClient.post("/auth/password-reset", values);
    setSubmitted(true);
  };

  return (
    <AuthLayout title="Reset password" subtitle="We'll email you a reset link">
      {submitted ? (
        <p className="font-body text-sm text-ink-navy">
          If that email is registered, a reset link has been sent. Check your inbox.
        </p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 font-body text-sm text-text-secondary">
        <Link
          to="/login"
          className="font-semibold text-ink-navy hover:underline transition-colors duration-200"
        >
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
