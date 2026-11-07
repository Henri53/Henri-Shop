import { saveSettings } from "@/lib/actions";
import { getSettings } from "@/lib/settings";
import SubmitButton from "@/components/SubmitButton";
import { Card, Field, btnPrimary, textareaCls } from "./ui";

export default async function Settings() {
  const s = await getSettings();

  return (
    <Card title="Shop settings">
      <form action={saveSettings} className="flex max-w-2xl flex-col gap-5">
        <Field label="Shop name" name="siteName" defaultValue={s.siteName} required hint="Shown in the top bar, the footer and the browser tab." />
        <Field label="Tagline" name="tagline" defaultValue={s.tagline} hint="The line under the heading on the shop page." />

        <div>
          <label htmlFor="new-announcement" className="mb-1 block text-sm text-muted">
            Announcement
          </label>
          <textarea
            id="new-announcement"
            name="announcement"
            rows={2}
            maxLength={300}
            defaultValue={s.announcement}
            placeholder="e.g. Restock tonight at 20:00. Delivery times may be longer today."
            className={textareaCls}
          />
          <p className="mt-1 text-xs text-muted">A highlighted banner on top of the shop. Leave empty to hide it.</p>
        </div>

        <Field
          label="Support link"
          name="supportUrl"
          type="url"
          defaultValue={s.supportUrl}
          placeholder="https://discord.gg/..."
          hint="Your Discord, Telegram or contact page. Adds a “Contact support” banner and footer link. Leave empty to hide it."
        />

        <label className="flex items-start gap-3 rounded-xl border border-border bg-raised p-4 text-sm">
          <input type="checkbox" name="purchasesPaused" defaultChecked={s.purchasesPaused} className="mt-0.5" />
          <span>
            <span className="font-medium">Pause purchases</span>
            <span className="mt-0.5 block text-muted">
              Customers can still browse and top up, but cannot buy. Useful while you restock.
            </span>
          </span>
        </label>

        <div>
          <SubmitButton pendingText="Saving…" className={btnPrimary}>
            Save settings
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
