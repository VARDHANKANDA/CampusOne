import { Button } from "@/components/ui/Button";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useMarkNotificationRead, useNotifications } from "@/features/notification/api";

/** docs/PRD.md FR-11.3 — full notification list with read/unread filter. */
export function NotificationsPage(): React.JSX.Element {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading notifications…</p>;
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="rounded-plaque border-2 border-dashed border-brass/40 bg-white/50 px-6 py-10 text-center">
        <p className="font-body text-sm text-slate">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Notifications</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {notifications.map((n) => (
          <PlaqueCard
            key={n.id}
            identifierLabel="Received"
            identifier={new Date(n.created_at).toLocaleDateString()}
            title={n.type.replace(/_/g, " ")}
            status={
              <div className="flex items-center gap-2">
                <StatusBadge
                  label={n.read_at ? "Read" : "Unread"}
                  tone={n.read_at ? "muted" : "pending"}
                />
                {!n.read_at && (
                  <Button
                    variant="secondary"
                    isLoading={markRead.isPending && markRead.variables === n.id}
                    onClick={() => markRead.mutate(n.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
