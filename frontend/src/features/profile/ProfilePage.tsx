import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { PasswordStrengthMeter } from "@/components/ui/PasswordStrengthMeter";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/useAuth";
import { passwordMeetsAllRules } from "@/core/validation/password";
import { useChangePassword, useUpdateProfile } from "@/features/profile/api";
import { ROLE_LABEL } from "@/routes/navigation";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  department: z.string().optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters")
      .refine(passwordMeetsAllRules, "Password doesn't meet all the requirements below"),
  })
  .refine((v) => v.current_password !== v.new_password, {
    message: "New password must be different from your current password",
    path: ["new_password"],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

export function ProfilePage(): React.JSX.Element {
  const { user, refreshProfile } = useAuth();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [profileMessage, setProfileMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name ?? "", department: user?.department ?? "" },
  });

  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });
  const newPasswordValue = passwordForm.watch("new_password") ?? "";

  if (!user) return <></>;

  const onSubmitProfile = async (values: ProfileFormValues): Promise<void> => {
    setProfileMessage(null);
    try {
      await updateProfile.mutateAsync(values);
      await refreshProfile();
      setProfileMessage({ kind: "success", text: "Profile updated." });
    } catch (err) {
      setProfileMessage({
        kind: "error",
        text: err instanceof ApiError ? err.message : "Could not update your profile. Try again.",
      });
    }
  };

  const onSubmitPassword = async (values: PasswordFormValues): Promise<void> => {
    setPasswordMessage(null);
    try {
      await changePassword.mutateAsync(values);
      passwordForm.reset();
      setPasswordMessage({ kind: "success", text: "Password changed." });
    } catch (err) {
      setPasswordMessage({
        kind: "error",
        text: err instanceof ApiError ? err.message : "Could not change your password. Try again.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">My Profile</h1>
        <p className="font-body text-sm text-text-secondary">
          Manage your account details and password.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-plaque border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="font-body text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Account details
          </h2>
          <div className="flex flex-col gap-1">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-text-secondary/90">
              Email
            </span>
            <span className="font-body text-sm text-text-primary">{user.email}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-text-secondary/90">
              Role
            </span>
            <div className="flex items-center gap-2">
              <StatusBadge label={ROLE_LABEL[user.role]} tone="success" />
              {user.requested_role && (
                <StatusBadge
                  label={`${ROLE_LABEL[user.requested_role]} request pending`}
                  tone="pending"
                />
              )}
            </div>
            {user.requested_role && (
              <p className="mt-1 font-body text-xs text-text-secondary">
                An administrator needs to approve this before your account becomes{" "}
                {ROLE_LABEL[user.requested_role]}.
              </p>
            )}
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={profileForm.handleSubmit(onSubmitProfile)}
            noValidate
          >
            {profileMessage && (
              <div
                role="alert"
                className={`rounded-plaque border px-3 py-2 text-sm ${
                  profileMessage.kind === "success"
                    ? "border-quad-green/30 bg-quad-green/5 text-quad-green"
                    : "border-brick/30 bg-brick/5 text-brick"
                }`}
              >
                {profileMessage.text}
              </div>
            )}
            <TextField
              label="Full name"
              autoComplete="name"
              error={profileForm.formState.errors.full_name?.message}
              {...profileForm.register("full_name")}
            />
            <TextField
              label="Department (optional)"
              error={profileForm.formState.errors.department?.message}
              {...profileForm.register("department")}
            />
            <Button
              type="submit"
              isLoading={profileForm.formState.isSubmitting}
              className="mt-1 w-fit"
            >
              Save changes
            </Button>
          </form>
        </section>

        <section className="flex flex-col gap-4 rounded-plaque border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="font-body text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Change password
          </h2>
          <form
            className="flex flex-col gap-4"
            onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
            noValidate
          >
            {passwordMessage && (
              <div
                role="alert"
                className={`rounded-plaque border px-3 py-2 text-sm ${
                  passwordMessage.kind === "success"
                    ? "border-quad-green/30 bg-quad-green/5 text-quad-green"
                    : "border-brick/30 bg-brick/5 text-brick"
                }`}
              >
                {passwordMessage.text}
              </div>
            )}
            <TextField
              label="Current password"
              type="password"
              autoComplete="current-password"
              error={passwordForm.formState.errors.current_password?.message}
              {...passwordForm.register("current_password")}
            />
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.new_password?.message}
              {...passwordForm.register("new_password")}
            />
            <PasswordStrengthMeter password={newPasswordValue} />
            <Button
              type="submit"
              isLoading={passwordForm.formState.isSubmitting}
              className="mt-1 w-fit"
            >
              Update password
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
