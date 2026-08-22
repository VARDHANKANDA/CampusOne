import { Link } from "react-router-dom";

const PRIMARY_LINK_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-plaque bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-2.5 font-body text-sm font-semibold text-white shadow-md shadow-indigo-500/10 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 dark:from-brass dark:to-brass-light dark:text-zinc-950";
const SECONDARY_LINK_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-plaque border border-card-border bg-card-bg/40 px-6 py-2.5 font-body text-sm font-semibold text-text-primary shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-card-bg hover:border-slate-300 dark:hover:border-slate-700";

interface RoleInfo {
  icon: string;
  title: string;
  tagline: string;
}

const ROLES: RoleInfo[] = [
  { icon: "🎓", title: "Student", tagline: "Bookings, complaints, attendance, and events." },
  { icon: "👨‍🏫", title: "Faculty", tagline: "Classrooms, labs, attendance, and events." },
  { icon: "🛠️", title: "Maintenance Staff", tagline: "Work orders and repair tracking." },
  { icon: "🏠", title: "Hostel Warden", tagline: "Complaints, assignments, and SLAs." },
  { icon: "🧑‍💼", title: "Admin", tagline: "Full operational control of the platform." },
];

export function LandingPage(): React.JSX.Element {
  return (
    <main className="saas-grid-bg min-h-screen bg-canvas">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <p className="font-display text-xl font-extrabold tracking-tight bg-gradient-to-r from-ink-navy via-brass to-brass-light bg-clip-text text-transparent">
          CampusOne
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="font-body text-sm font-semibold text-text-primary hover:text-ink-navy dark:hover:text-brass transition-colors duration-200"
          >
            Sign in
          </Link>
          <Link to="/register" className={`${PRIMARY_LINK_CLASS} px-4 py-2 text-sm`}>
            Create account
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-10 pb-16 text-center sm:pt-16">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
          One platform for the VIT-AP campus
        </h1>
        <p className="mt-4 font-body text-base text-text-secondary sm:text-lg">
          Bookings, hostel complaints, maintenance, attendance, events, and more — built for
          VIT-AP students, faculty, maintenance staff, hostel wardens, and administrators alike.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className={PRIMARY_LINK_CLASS}>
            Get started
          </Link>
          <Link to="/login" className={SECONDARY_LINK_CLASS}>
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-8 text-center font-display text-xl font-bold text-text-primary sm:text-2xl">
          Built for every role on campus
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((role) => (
            <Link
              key={role.title}
              to="/login"
              className="group flex flex-col items-center gap-2 rounded-plaque border border-card-border bg-card-bg/70 backdrop-blur-md p-6 text-center shadow-sm transition-all duration-200 hover:shadow-lg hover:border-ink-navy/30 dark:hover:border-brass/30"
            >
              <span className="text-4xl" aria-hidden="true">
                {role.icon}
              </span>
              <h3 className="font-display text-base font-bold text-text-primary">{role.title}</h3>
              <p className="font-body text-xs text-text-secondary">{role.tagline}</p>
              <span className="mt-2 font-body text-xs font-semibold text-ink-navy group-hover:underline dark:text-brass">
                Sign in →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-card-border px-6 py-8 text-center font-body text-xs text-text-secondary">
        CampusOne
      </footer>
    </main>
  );
}
