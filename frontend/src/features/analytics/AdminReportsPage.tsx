import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import {
  useComplaintStats,
  useEquipmentStats,
  useMaintenanceStats,
  useRoomUtilization,
} from "@/features/analytics/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// docs/UI_UX.md §10 — Ink Navy + Brass + Quad Green + Brick only, never
// arbitrary chart-library defaults.
const PALETTE = {
  inkNavy: "#1B2A4A",
  brass: "#B8863E",
  quadGreen: "#3F6B4F",
  brick: "#A8412C",
};

function StatTile({ label, value }: { label: string; value: string | number }): React.JSX.Element {
  return (
    <div className="rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1">
      <p className="font-body text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink-navy">{value}</p>
    </div>
  );
}

function barData(labels: string[], values: number[], color: string) {
  return {
    labels,
    datasets: [{ data: values, backgroundColor: color }],
  };
}

/** docs/PRD.md FR-12.1-FR-12.2 — admin dashboard across room utilization,
 * complaints, equipment, and maintenance performance.
 */
export function AdminReportsPage(): React.JSX.Element {
  const { data: utilization } = useRoomUtilization();
  const { data: complaints } = useComplaintStats();
  const { data: equipment } = useEquipmentStats();
  const { data: maintenance } = useMaintenanceStats();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl text-ink-navy">Reports &amp; Analytics</h1>

      {maintenance && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Maintenance requests" value={maintenance.total_requests} />
          <StatTile label="Completed" value={maintenance.completed_requests} />
          <StatTile
            label="Avg. resolution (hrs)"
            value={
              maintenance.average_resolution_hours === null
                ? "—"
                : maintenance.average_resolution_hours.toFixed(1)
            }
          />
        </div>
      )}

      {utilization && utilization.length > 0 && (
        <div className="rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1">
          <h2 className="mb-3 font-body text-sm font-semibold uppercase tracking-wide text-slate">
            Room utilization (hours booked)
          </h2>
          <Bar
            data={barData(
              utilization.map((r) => r.room_name),
              utilization.map((r) => r.total_hours),
              PALETTE.brass,
            )}
            options={{ responsive: true, plugins: { legend: { display: false } } }}
          />
        </div>
      )}

      {complaints && (
        <div className="rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1">
          <h2 className="mb-3 font-body text-sm font-semibold uppercase tracking-wide text-slate">
            Complaints by status
          </h2>
          <Bar
            data={barData(
              Object.keys(complaints.by_status),
              Object.values(complaints.by_status),
              PALETTE.inkNavy,
            )}
            options={{ responsive: true, plugins: { legend: { display: false } } }}
          />
        </div>
      )}

      {equipment && (
        <div className="rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1">
          <h2 className="mb-3 font-body text-sm font-semibold uppercase tracking-wide text-slate">
            Equipment by status
          </h2>
          <Bar
            data={barData(
              Object.keys(equipment.by_status),
              Object.values(equipment.by_status),
              PALETTE.quadGreen,
            )}
            options={{ responsive: true, plugins: { legend: { display: false } } }}
          />
        </div>
      )}
    </div>
  );
}

export function HostelReportsPage(): React.JSX.Element {
  const { data: complaints, isLoading } = useComplaintStats();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink-navy dark:text-brass">
          Hostel Reports &amp; Analytics
        </h1>
        <p className="font-body text-sm text-text-secondary mt-1">
          Overview of hostel complaint statuses, categories, and resolution priorities.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink-navy/20 border-t-ink-navy dark:border-brass/20 dark:border-t-brass" />
        </div>
      ) : complaints ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1">
            <h2 className="mb-4 font-body text-sm font-bold uppercase tracking-wider text-text-secondary">
              Complaints by Status
            </h2>
            <Bar
              data={barData(
                Object.keys(complaints.by_status).map((k) => k.replace(/_/g, " ")),
                Object.values(complaints.by_status),
                PALETTE.inkNavy,
              )}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          </div>

          <div className="rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1">
            <h2 className="mb-4 font-body text-sm font-bold uppercase tracking-wider text-text-secondary">
              Complaints by Priority
            </h2>
            <Bar
              data={barData(
                Object.keys(complaints.by_priority).map((k) => k.toUpperCase()),
                Object.values(complaints.by_priority),
                PALETTE.brick,
              )}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          </div>

          <div className="md:col-span-2 rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1">
            <h2 className="mb-4 font-body text-sm font-bold uppercase tracking-wider text-text-secondary">
              Complaints by Category
            </h2>
            <Bar
              data={barData(
                Object.keys(complaints.by_category).map((k) => k.replace(/_/g, " ")),
                Object.values(complaints.by_category),
                PALETTE.brass,
              )}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-plaque border border-card-border bg-card-bg p-8 text-center text-text-secondary">
          No complaint data recorded yet.
        </div>
      )}
    </div>
  );
}
