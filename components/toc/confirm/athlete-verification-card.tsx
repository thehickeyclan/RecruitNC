"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TocAthleteWithInvitation } from "@/lib/toc/invitation-service"
import { registrationPayPageUrl } from "@/lib/toc/invitation-service"
import { formatTocGradYear } from "@/lib/toc/invitations"
import { formatTocRegistrationFee, registrationPaymentDueDisplay } from "@/lib/toc/registration-policy"

type Props = {
  data: TocAthleteWithInvitation
  onConfirm: () => void
  onReject: () => void
}

export function AthleteVerificationCard({ data, onConfirm, onReject }: Props) {
  const { athlete, invitation } = data
  const alreadyConfirmed = invitation?.status === "confirmed"

  return (
    <Card className="border-2 border-[#0B1D3A]/10 border-l-4 border-l-[#CC0000]">
      <CardHeader>
        <CardTitle className="text-[#0B1D3A] text-xl">Is this you?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-start">
          {athlete.photoUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#0B1D3A]/10">
              <Image src={athlete.photoUrl} alt="" fill className="object-cover" sizes="64px" />
            </div>
          ) : null}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm flex-1">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-semibold text-[#0B1D3A]">{athlete.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">High school</dt>
              <dd className="font-semibold text-[#0B1D3A]">{athlete.school ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Grad year</dt>
              <dd className="font-semibold text-[#0B1D3A]">{formatTocGradYear(athlete.graduationYear) ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Club</dt>
              <dd className="font-semibold text-[#0B1D3A]">{athlete.club ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Profile weight</dt>
              <dd className="font-semibold text-[#0B1D3A]">
                {athlete.weightClass != null && athlete.weightClass !== "" ? `${athlete.weightClass} lbs` : "—"}
              </dd>
            </div>
            {invitation ? (
              <div>
                <dt className="text-muted-foreground">Invited weight</dt>
                <dd className="font-semibold text-[#CC0000]">{invitation.weightClass} lbs</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {alreadyConfirmed ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-sm px-3 py-2">
              You&apos;re already confirmed for this tournament.
            </p>
            {invitation?.paymentStatus === "paid" ? (
              <p className="text-sm text-green-700">Registration is paid — you&apos;re all set.</p>
            ) : (
              <p className="text-sm text-[#0B1D3A]/75">
                Already confirmed?{" "}
                <a href={registrationPayPageUrl(athlete.id)} className="text-[#0B1D3A] underline hover:text-[#CC0000]">
                  Complete required registration payment
                </a>{" "}
                ({formatTocRegistrationFee()} by {registrationPaymentDueDisplay()}).
              </p>
            )}
          </div>
        ) : invitation?.status === "invited" ? (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="button" className="bg-[#CC0000] hover:bg-[#a80000]" onClick={onConfirm}>
              Yes, this is me
            </Button>
            <Button type="button" variant="outline" onClick={onReject}>
              No — search again
            </Button>
          </div>
        ) : (
          <p className="text-sm text-red-600">
            We don&apos;t have an open invitation on file for this profile. Email{" "}
            <a href="mailto:info@ncwrestlingunited.com" className="underline">
              info@ncwrestlingunited.com
            </a>
            .
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Wrong school or grad year? Update your RecruitNC profile first, then return here.
        </p>
      </CardContent>
    </Card>
  )
}
