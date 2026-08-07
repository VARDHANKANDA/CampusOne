import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { useAttendanceReports } from "@/features/attendance/api";

/** docs/PRD.md Module 12 uses this same data; this view is FR-6's own
 * per-session summary (own sessions for faculty, all for admin).
 */
export function AttendanceReportsPage(): React.JSX.Element {
  const { data: reports, isLoading } = useAttendanceReports();

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading reports…</p>;
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
        <p className="font-body text-sm text-slate">No attendance sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Attendance Reports</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <PlaqueCard
            key={report.session_id}
            identifierLabel="Scans"
            identifier={String(report.scan_count)}
            title={report.course_code}
            meta={new Date(report.created_at).toLocaleString()}
          />
        ))}
      </div>
    </div>
  );
}
