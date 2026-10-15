import { InboxScreen } from "./inbox-screen"

export const dynamic = "force-dynamic"

/** Recruiting messages: coaches and the families they wrote to. See lib/coach-messages.ts. */
export default function InboxPage() {
  return <InboxScreen threadId={null} />
}
