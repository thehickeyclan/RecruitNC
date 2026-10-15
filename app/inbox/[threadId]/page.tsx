import { InboxScreen } from "../inbox-screen"

export const dynamic = "force-dynamic"

/** One conversation, open in the inbox (components/coach-messages/inbox-panes.tsx). */
export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  return <InboxScreen threadId={threadId} />
}
