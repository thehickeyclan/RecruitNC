export default function DropInCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-8 py-10 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900">Stripe payment cancelled</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            No charge was made. Close this tab and return to the calendar to try again, or email{" "}
            <a className="text-slate-900 font-medium" href="mailto:info@ncwrestlingunited.com">
              info@ncwrestlingunited.com
            </a>{" "}
            if you need help.
          </p>
        </div>
      </div>
    </div>
  )
}
