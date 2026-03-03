import { NextRequest, NextResponse } from "next/server"

/** Redirect /store/product/[id] to /store-app/product/[id] so all store UI is under /store-app. */
export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) =>
    NextResponse.redirect(new URL(`/store-app/product/${id}`, _request.url), 302)
  )
}
