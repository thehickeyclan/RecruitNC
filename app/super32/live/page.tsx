import { CommandCenter } from "./command-center"
import { commandCenterFont } from "./font"

export const metadata = {
  title: "Super 32 Command Center | NC United",
  description: "Every North Carolina wrestler at Super 32 in one place: NC's record, Huge and Big wins, round recaps and who's still alive.",
}

export default function Super32LivePage() {
  return (
    <div className={commandCenterFont.variable}>
      <CommandCenter />
    </div>
  )
}
