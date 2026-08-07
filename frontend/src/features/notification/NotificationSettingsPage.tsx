import { useNotificationSettings, useUpdateNotificationSetting } from "@/features/notification/api";

/** docs/PRD.md FR-11.6 — admin toggles the optional email channel per event
 * type. In-app + Realtime always fires regardless of this setting (FR-11.5).
 */
export function NotificationSettingsPage(): React.JSX.Element {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateSetting = useUpdateNotificationSetting();

  if (isLoading) {
    return <p className="font-body text-sm text-slate">Loading settings…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-navy">Notification Settings</h1>
      <p className="font-body text-sm text-slate">
        Toggle whether each event also sends an email, in addition to the always-on in-app
        notification.
      </p>
      <div className="flex flex-col divide-y divide-slate/15 rounded-plaque border border-slate/15 bg-white shadow-level-1">
        {settings?.map((setting) => (
          <div key={setting.id} className="flex items-center justify-between px-4 py-3">
            <span className="font-body text-sm capitalize text-ink-navy">
              {setting.event_type.replace(/_/g, " ")}
            </span>
            <label className="flex items-center gap-2 font-body text-sm text-slate">
              <input
                type="checkbox"
                checked={setting.email_enabled}
                onChange={(e) =>
                  updateSetting.mutate({
                    eventType: setting.event_type,
                    emailEnabled: e.target.checked,
                  })
                }
              />
              Email
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
