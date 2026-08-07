import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { TextField } from "@/components/ui/TextField";
import {
  useCreateSession,
  useSessionRecords,
  useRotateSession,
} from "@/features/attendance/api";
import type { AttendanceSession } from "@/features/attendance/types";

const ROTATION_INTERVAL_SEC = 15;

export function GenerateAttendancePage(): React.JSX.Element {
  const [courseCode, setCourseCode] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(ROTATION_INTERVAL_SEC);

  const createSession = useCreateSession();
  const rotateSession = useRotateSession();
  const { data: records } = useSessionRecords(activeSession?.id ?? null);

  const onGenerate = (e: React.FormEvent): void => {
    e.preventDefault();
    createSession.mutate(
      { course_code: courseCode, duration_minutes: durationMinutes },
      {
        onSuccess: (session) => {
          setActiveSession(session);
          setSecondsLeft(ROTATION_INTERVAL_SEC);
        },
      }
    );
  };

  // Timer countdown and rotation effect
  useEffect(() => {
    if (!activeSession) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Trigger token rotation on server
          rotateSession.mutate(activeSession.id, {
            onSuccess: (updatedSession) => {
              setActiveSession(updatedSession);
            },
          });
          return ROTATION_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession, rotateSession]);

  // Visual bar width percent
  const progressPercent = (secondsLeft / ROTATION_INTERVAL_SEC) * 100;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Generate QR Attendance</h1>
        <p className="font-body text-xs text-slate mt-1">Start a short-lived class attendance session with rotating secure tokens</p>
      </div>

      <form
        onSubmit={onGenerate}
        className="flex flex-wrap items-end gap-3 rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1"
      >
        <TextField
          label="Course Code / Name"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
          required
          placeholder="e.g. CS-302"
        />
        <TextField
          label="Duration (minutes, max 30)"
          type="number"
          min={1}
          max={30}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
        />
        <Button type="submit" isLoading={createSession.isPending} className="py-2.5 px-5">
          Generate Session
        </Button>
      </form>

      {activeSession && (
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          
          {/* QR Display Card */}
          <div className="rounded-plaque border border-card-border bg-card-bg p-6 shadow-level-2 text-center w-full max-w-xs space-y-4">
            
            {/* Visual Rotation Timer Countdown */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-slate uppercase">
                <span>Anti-Share Rotation</span>
                <span className="font-mono text-brass">{secondsLeft}s left</span>
              </div>
              <div className="h-1.5 w-full bg-canvas rounded-full overflow-hidden">
                <div
                  className="h-full bg-brass transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-plaque border border-card-border">
              <QRCodeSVG value={activeSession.qr_token} size={200} />
            </div>

            <div>
              <p className="font-mono text-sm font-bold text-text-primary">{activeSession.course_code}</p>
              <p className="font-body text-[11px] text-slate mt-1">
                Expires at {new Date(activeSession.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Realtime Scanned list */}
          <div className="flex-1 w-full">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-slate border-b border-card-border pb-1">
              Scanned Registered Students ({records?.length ?? 0})
            </h2>
            
            {(!records || records.length === 0) ? (
              <div className="rounded-plaque border border-dashed border-card-border bg-card-bg/40 p-10 text-center text-xs text-slate">
                Awaiting student scans. Share the rotating QR code on screen.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {records.map((record) => (
                  <div key={record.id} className="rounded-plaque border border-card-border bg-card-bg">
                    <PlaqueCard
                      identifierLabel="Student"
                      identifier={record.student_name}
                      title={record.student_name}
                      meta={`Scanned at: ${new Date(record.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
