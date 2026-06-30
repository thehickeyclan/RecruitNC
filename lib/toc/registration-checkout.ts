import { z } from "zod"

export const tocRegistrationCheckoutSchema = z.object({
  athleteId: z.string().uuid(),
})

export type TocRegistrationCheckoutInput = z.infer<typeof tocRegistrationCheckoutSchema>
