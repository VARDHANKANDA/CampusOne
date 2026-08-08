import { Link } from "react-router-dom";

const PRIMARY_LINK_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-plaque bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-2.5 font-body text-sm font-semibold text-white shadow-md shadow-indigo-500/10 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 dark:from-brass dark:to-brass-light dark:text-zinc-950";
const SECONDARY_LINK_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-plaque border border-card-border bg-card-bg/40 px-6 py-2.5 font-body text-sm font-semibold text-text-primary shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-card-bg hover:border-slate-300 dark:hover:border-slate-700";

interface RoleInfo {
  icon: string;
  title: string;
  tagline: string;
  can: string[];
}

const ROLES: RoleInfo[] = [
  {
    icon: "🎓",
    title: "Student",
    tagline: "The main end user.",
    can: [
      "View campus dashboard",
      "Search classrooms/labs",
      "Book available resources",
      "Reserve lab seats",
      "Submit hostel complaints",
      "Track complaint status",
      "Report lost & found items",
      "View events & RSVP",
      "Scan QR for attendance",
      "View attendance history",
      "View assigned equipment",
      "Receive notifications",
      "Manage profile/preferences",
    ],
  },
  {
    icon: "👨‍🏫",
    title: "Faculty",
    tagline: "Everything a student has, plus teaching-related capabilities.",
    can: [
      "Book classrooms & reserve labs",
      "Create recurring bookings",
      "Schedule events",
      "Generate QR attendance",
      "View & export attendance",
      "Request equipment",
      "View room availability",
      "Cancel/modify their bookings",
      "Manage their events",
      "Receive notifications",
    ],
  },
  {
    icon: "🛠️",
    title: "Maintenance Staff",
    tagline: "Responsible for physical infrastructure.",
    can: [
      "View assigned maintenance tasks",
      "Accept work orders",
      "Update task status",
      "Add comments",
      "Upload repair photos",
      "Record repair costs",
      "Mark tasks completed",
      "View maintenance history",
      "Receive priority alerts",
    ],
  },
  {
    icon: "🏠",
    title: "Hostel Warden",
    tagline: "Responsible for hostel-related operations.",
    can: [
      "View hostel complaints",
      "Filter by hostel/block/room",
      "Assign maintenance staff",
      "Change complaint priority",
      "Escalate complaints & track SLA",
      "Verify completed work",
      "View complaint analytics",
      "Communicate with students",
      "View hostel maintenance history",
    ],
  },
  {
    icon: "🧑‍💼",
    title: "Admin",
    tagline: "The highest operational role.",
    can: [
      "Manage users, roles & permissions",
      "Manage buildings, classrooms & labs",
      "Manage equipment & inventory",
      "Approve bookings",
      "Manage events, complaints & maintenance",
      "Manage notifications & settings",
      "View analytics & audit logs",
      "Configure system settings",
      "Export reports",
    ],
  },
];

export function LandingPage(): React.JSX.Element {
  return (
    <main className="saas-grid-bg min-h-screen bg-canvas">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <p className="font-display text-xl font-extrabold tracking-tight bg-gradient-to-r from-ink-navy via-brass to-brass-light bg-clip-text text-transparent">
          Smart Campus
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
          One platform for your entire campus
        </h1>
        <p className="mt-4 font-body text-base text-text-secondary sm:text-lg">
          Bookings, hostel complaints, maintenance, attendance, events, and more — built for
          students, faculty, maintenance staff, hostel wardens, and administrators alike.
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

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-8 text-center font-display text-xl font-bold text-text-primary sm:text-2xl">
          Built for every role on campus
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {ROLES.map((role) => (
            <article
              key={role.title}
              className="flex flex-col rounded-plaque border border-card-border bg-card-bg/70 backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-ink-navy/30 dark:hover:border-brass/30"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">
                  {role.icon}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-text-primary">{role.title}</h3>
                  <p className="font-body text-xs text-text-secondary">{role.tagline}</p>
                </div>
              </div>
              <ul className="mb-5 flex max-h-52 flex-col gap-1.5 overflow-y-auto pr-1 font-body text-sm text-text-secondary">
                {role.can.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-quad-green" aria-hidden="true">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="mt-auto text-center font-body text-sm font-semibold text-ink-navy hover:underline dark:text-brass"
              >
                Sign in as {role.title} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-card-border px-6 py-8 text-center font-body text-xs text-text-secondary">
        Smart Campus Infrastructure Platform
      </footer>
    </main>
  );
}
