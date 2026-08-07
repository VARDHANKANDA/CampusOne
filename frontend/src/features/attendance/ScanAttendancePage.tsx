import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/core/api/types";
import { useScanAttendance } from "@/features/attendance/api";

/** docs/PRD.md FR-6.2 — student marks attendance from a scanned QR code.
 * Camera-based scanning needs a real device to verify and isn't testable in
 * this environment; the token is entered manually here (a real QR scanner
 * library would populate the same field). Tracked as a known simplification.
 */
export function ScanAttendancePage(): React.JSX.Element {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const scanAttendance = useScanAttendance();

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    scanAttendance.mutate(token, {
      onSuccess: () => {
        setSuccess(true);
        setToken("");
      },
      onError: (err) => {
        setError(err instanceof ApiError ? err.message : "Could not record attendance.");
      },
    });
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-2xl text-ink-navy">Scan Attendance</h1>
      <p className="mt-1 font-body text-sm text-slate">
        Enter the code shown on your instructor's QR display.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="rounded-plaque border border-brick/30 bg-brick/5 px-3 py-2 text-sm text-brick"
          >
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-plaque border border-quad-green/30 bg-quad-green/5 px-3 py-2 text-sm text-quad-green">
            Attendance recorded.
          </div>
        )}
        <TextField
          label="Session code"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        <Button type="submit" isLoading={scanAttendance.isPending}>
          Mark attendance
        </Button>
      </form>
    </div>
  );
}
