/** Placeholder for a nav destination whose module hasn't landed yet — replaced
 * by the real feature route when that module is implemented (see the project
 * task list). Not a stand-in for real business logic, just routing scaffolding.
 */
export function ModulePlaceholder({ title }: { title: string }): React.JSX.Element {
  return (
    <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
      <h1 className="font-display text-xl text-ink-navy">{title}</h1>
      <p className="mt-2 font-body text-sm text-slate">This module hasn't been implemented yet.</p>
    </div>
  );
}
