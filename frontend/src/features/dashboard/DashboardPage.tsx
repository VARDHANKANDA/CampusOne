import { Link } from "react-router-dom";

import { useAuth } from "@/core/auth/useAuth";
import { DASHBOARD_CONFIG } from "@/features/dashboard/dashboardConfig";
import { ROLE_LABEL } from "@/routes/navigation";

/** docs/PRD.md Module 10 — role-specific landing experience (FR-10.1-FR-10.4). */
export function DashboardPage(): React.JSX.Element {
  const { user } = useAuth();
  if (!user) return <></>;

  const config = DASHBOARD_CONFIG[user.role];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink-navy">Welcome, {user.full_name}</h1>
        <p className="mt-1 font-body text-sm text-slate">{ROLE_LABEL[user.role]} dashboard</p>
      </div>

      <section>
        <h2 className="mb-2 font-body text-sm font-semibold uppercase tracking-wide text-slate">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {config.quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="rounded-plaque border border-slate/15 bg-white px-4 py-3 font-body text-sm text-ink-navy shadow-level-1 transition hover:-translate-y-0.5 hover:shadow-level-2 hover:text-brass"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-body text-sm font-semibold uppercase tracking-wide text-slate">
          {config.attentionPanelTitle}
        </h2>
        <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-8 text-center">
          <p className="font-body text-sm text-slate">{config.attentionEmptyCopy}</p>
        </div>
      </section>
    </div>
  );
}
