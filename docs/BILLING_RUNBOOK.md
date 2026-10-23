# Billing & Telegram runbook

## Reminders stopped

1. Check Railway service is running (always-on; not sleeping).
2. `GET /health` (or `/api/health`) should return `{ success: true, data: { status: "ok", … } }`.
3. Confirm env: `TELEGRAM_BOT_TOKEN`, `ENABLE_REMINDER_CRON=true`.
4. Manually trigger:  
   `POST /api/internal/reminders/run` with header `X-Reminder-Secret: <REMINDER_JOB_SECRET>`.
5. Inspect response `data.sent` / `data.errors` / `data.details`.
6. If members show `no_telegram`, they must complete Link Telegram in the app.
7. MongoDB backups: ensure Atlas continuous backup or scheduled snapshots are on.

## Payment stuck (pending transfer)

1. Admin → Review queue — confirm screenshot is visible.
2. If upload failed: member re-uploads from Membership (JPEG/PNG ≤5MB).
3. Approve or reject with a clear reason.
4. If approve returns error "Invoice is already paid": another payment already applied — reject the duplicate.
5. Check `Payment` document status and `AuditLog` for `payment_approved` / `payment_rejected` / `payment_applied`.

## Cash not extending membership

1. Confirm membership exists on the member detail page.
2. Retry with a new `idempotencyKey` (UI generates one per click).
3. Verify `applyPayment` path: invoice must be `open` or `overdue`.

## Telegram link fails

1. Member generates a fresh 6-digit code (15 min TTL).
2. Bot webhook must hit `POST /api/telegram/webhook` with `X-Telegram-Bot-Api-Secret-Token`.
3. Set webhook:  
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR_API/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>`
