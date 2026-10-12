/**
 * The "get the iPhone app" block that closes every receipt.
 *
 * A receipt is the one email a buyer is certain to open, so it is where the app is offered.
 * Its own file so the store, national team and general receipts all say the same thing.
 */

export const NC_UNITED_APP_STORE_URL = "https://apps.apple.com/app/id6803202791"

export function appDownloadEmailHtml(): string {
  return `<div style="margin: 24px 0 0; padding: 16px 18px; background: #f1f5f9; border-radius: 8px;">
      <p style="margin: 0 0 6px; font-weight: bold; color: #03154C;">Get the NC United app for iPhone</p>
      <p style="margin: 0 0 12px; font-size: 14px; color: #374151;">Rankings, results and wrestler profiles on your phone, with alerts when something changes.</p>
      <a href="${NC_UNITED_APP_STORE_URL}" style="display: inline-block; background: #03154C; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 10px 16px; border-radius: 6px;">Download on the App Store</a>
    </div>`
}

export function appDownloadEmailText(): string {
  return `Get the NC United app for iPhone: rankings, results and wrestler profiles on your phone, with alerts when something changes.\n${NC_UNITED_APP_STORE_URL}`
}
