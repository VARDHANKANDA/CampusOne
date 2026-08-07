import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { TextField } from "@/components/ui/TextField";
import { useCreateSession, useSessionRecords } from "@/features/attendance/api";

/** docs/PRD.md FR-6.1 — faculty generates a dynamic, short-lived QR code
 * (5 min default, capped at 30 — docs/DECISIONS.md ADR-018). Record list
 * polls every 5s so scans appear live (FR-6.2 "instantly").
 */
export function GenerateAttendancePage(): React.JSX.Element {
  const [courseCode, setCourseCode] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const createSession = useCreateSession();
  const { data: records } = useSessionRecords(createSession.data?.id ?? null);

  const onGenerate = (e: React.FormEvent): void => {
    e.preventDefault();
    createSession.mutate({ course_code: courseCode, duration_minutes: durationMinutes });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Generate Attendance QR</h1>

      <form
        onSubmit={onGenerate}
        className="flex flex-wrap items-end gap-3 rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1"
      >
        <TextField
          label="Course code"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
          required
        />
        <TextField
          label="Duration (minutes, max 30)"
          type="number"
          min={1}
          max={30}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
        />
        <Button type="submit" isLoading={createSession.isPending}>
          Generate QR
        </Button>
      </form>

      {createSession.data && (
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div className="rounded-plaque border border-slate/15 bg-white p-6 shadow-level-1">
            <QRCodeSVG value={createSession.data.qr_token} size={220} />
            <p className="mt-3 font-mono text-xs text-slate">{createSession.data.course_code}</p>
            <p className="font-body text-xs text-slate">
              Expires {new Date(createSession.data.expires_at).toLocaleTimeString()}
            </p>
          </div>

          <div className="flex-1">
            <h2 className="mb-2 font-body text-sm font-semibold uppercase tracking-wide text-slate">
              Scanned ({records?.length ?? 0})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {records?.map((record) => (
                <PlaqueCard
                  key={record.id}
                  identifierLabel="Student"
                  identifier={record.student_name}
                  title={record.student_name}
                  meta={new Date(record.scanned_at).toLocaleTimeString()}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
