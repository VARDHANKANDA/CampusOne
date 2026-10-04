import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/core/auth/useAuth";
import { ApiError } from "@/core/api/types";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { OAuthButtons } from "@/features/auth/OAuthButtons";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage(): React.JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues): Promise<void> => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 0 || err.code === "NETWORK_ERROR") {
          setFormError("Unable to connect to the backend server. Please check your connection.");
        } else if (err.status === 401 || err.code === "UNAUTHORIZED") {
          setFormError("Invalid email or password.");
        } else if (err.status >= 500) {
          setFormError("Unable to sign in right now. Please try again later.");
        } else {
          setFormError(err.message);
        }
      } else if (err instanceof Error) {
        if (err.message === "Network Error" || err.message.includes("Network Error")) {
          setFormError("Unable to connect to the backend server. Please check your connection.");
        } else {
          setFormError(err.message || "Invalid email or password.");
        }
      } else {
        setFormError("Something went wrong. Try again.");
      }
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="CampusOne">
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
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Sign in
        </Button>
      </form>
      <div className="mt-6">
        <OAuthButtons />
      </div>
      <div className="saas-interactive mt-6 flex justify-between font-body text-sm">
        <Link
          to="/forgot-password"
          className="text-ink-navy/85 dark:text-brass/85 hover:text-ink-navy dark:hover:text-brass font-medium transition-colors duration-200"
        >
          Forgot password?
        </Link>
        <Link
          to="/register"
          className="text-ink-navy/85 dark:text-brass/85 hover:text-ink-navy dark:hover:text-brass font-medium transition-colors duration-200"
        >
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
}
