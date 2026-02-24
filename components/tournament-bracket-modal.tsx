"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Image from "next/image"

interface TournamentBracketModalProps {
  isOpen: boolean
  onClose: () => void
  weightClass: string
  classification: string
}

export function TournamentBracketModal({ isOpen, onClose, weightClass, classification }: TournamentBracketModalProps) {
  const getBracketImage = () => {
    if (classification === "1A") {
      switch (weightClass) {
        case "106":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_106-FfIzpzPhf2igYVn601JHpDdO9m0EB4.png"
        case "113":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_113-zu13cgBW2op2pDIBaBlkNkrxkq9Meg.png"
        case "120":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_120-CAsaJl3ymbv9PpfamvwWHtgjoplRQy.png"
        case "126":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_126-VpNCtRCYfw7RBQfHfhu0pEJ96htVBg.png"
        case "132":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_132-5W1QipGjLwEuCKL7SXZQbuUmByC7qd.png"
        case "138":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_138-yHWZEsPq0jhozKls4JHV7pkyyzrq7p.png"
        case "144":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_144-fjDqtHeGrQcl540Z9Wq8jKFCq4qhZ5.png"
        case "150":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_150-gx1jHt4ObpFDtj3JNl1QTzJpgfVzTN.png"
        case "157":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_157-6EjfxeGyjBQxerFXWmKoXqEqjmka8V.png"
        case "165":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_165-77wKGGSh0ALvO1cntE2meIxvfOBQ2E.png"
        case "175":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_175-fxMny8ttNduf9aubyW9t9bLRyiJUfH.png"
        case "190":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_190-l7N6go0bASHziWkBCZFblOTjnazdGC.png"
        case "215":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_215-iOawiyl1MxtGLtB6v13CVc1vNOU9Nt.png"
        case "285":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1A_285-sbvmFh0XkK78S9PlBpTtYwXLIMRYg6.png"
      }
    }

    if (classification === "2A") {
      switch (weightClass) {
        case "106":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_106-4YueaLhiP3KC8O2ORmpriryp0lJ9UY.png"
        case "113":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_113-iuKYPqSUr5ADB7Jaj5nnNeVOOkx5JT.png"
        case "120":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_120-SJdu4tZsLUonQcuuzZMTVnEzaTf7dj.png"
        case "126":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_126-PuT6pjURZ4PLvWq8DvEyWbJ3WHfGMM.png"
        case "132":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_132-BKVYCkmKrZktmNIXkHAD1y6CkKBTzg.png"
        case "138":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_138-Ce7icfLGpgFeO8AklcGMZrv3nZdFIo.png"
        case "144":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_144-p2VeXWPwxBWz5aw3oT4eSDQLWMRo6O.png"
        case "150":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_150-IsZxMAIFFcZOWS1csCXBzeNxpKGjRw.png"
        case "157":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_157-78WdxBA1MvoYS92O8vnhz4Ec4EX18s.png"
        case "165":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_165-M81FgeajBXOB3ri0UR2McnKMSV7qzT.png"
        case "175":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_175-zGn4Nm2zKXL0jNEdwMuTyY8QRgcxxY.png"
        case "190":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_190-PoGGZtQOLZsrGk4PdFiiishpm1w02K.png"
        case "215":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_215-P42tSzObZbpaxnyQzLyxwFloCqS1oj.png"
        case "285":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2A_285-X2g2x6nttoBGI9A9FlhCwBVXYXPbhs.png"
      }
    }

    if (classification === "3A") {
      switch (weightClass) {
        case "106":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_106-MIXnpCcqSQo1d61WmtttrITb3NC7yB.png"
        case "113":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_113-7RwjxLcfzf8UflvijTK9ikXLRXCFML.png"
        case "120":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_120-9bhw0eFiagK4QKxVePrQ6ObWg0e8cQ.png"
        case "126":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_126-dKDtSLASpBBFdZE8AMTnpZEUuPoKG3.png"
        case "132":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_132-HepDsNc2SYQaXf9r20ej2BDi5A67Gf.png"
        case "138":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_138-SOcJ8iOxBuAHa9bAHWR9O3MElJxBU3.png"
        case "144":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_144-Lmvwzz4A1SplnFQuqwepZbh8jPOUNd.png"
        case "150":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_150-SelLjhVfUzN5mrbNELMnsk4sDukLqM.png"
        case "157":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_157-Obh9ziOljXFcCLN0uu6OQ31CVaHaaB.png"
        case "165":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_165-6au4RL0CwpPd3Eo8C8ftlLGiFPI0vD.png"
        case "175":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_175-pVJ0Spg7R5pZRp2VArOjHkTvbXAzJq.png"
        case "190":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_190-VdWeoqdxtGcdv9Oqmcge72gnV5wP1x.png"
        case "215":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_215-a035tFE9ziGh3pH0Xb1DGZRpQeGSaR.png"
        case "285":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3A_285-XIiO1ZxPnvbCYWavoJpjRTKDSAbBUl.png"
      }
    }

    if (classification === "4A") {
      switch (weightClass) {
        case "106":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_106-3J14wuPEPZrmCxDEgpBm7IvYMvI8Gc.png"
        case "113":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_113-rRXePRNjpfAS2JYiOe5WQLXlbNmNOf.png"
        case "120":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_120-c6utVXMALoJcshi0GRgioNXN19KRyZ.png"
        case "126":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_126-NjJTsJZIySaJCu0LO8eECANaTH7dxC.png"
        case "132":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_132-q5KiESD2TPc0C7pw4iRpRkIsrOTLxi.png"
        case "138":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_138-C0TMxxULFNWboS9bBXaQ8hXkJrsSJw.png"
        case "144":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_144-aEGCTJuivAFBDauEfbA71PGQNonvRa.png"
        case "150":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_150-qGEUpWTeAdAXbWvSuOFF0QKzeD2CE8.png"
        case "157":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_157-lJLDKNRCvOsPPm88Iey2Qz8NlQONLv.png"
        case "165":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_165-hdymYLgthNthcIsmr5OgoSi39XVp5a.png"
        case "175":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_175-S1CSAByCPs02vjzghGgCKeSW5Qs4ho.png"
        case "190":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_190-c0xSvUZE2fhX3EYZXjSmhaGhYL7NXj.png"
        case "215":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_215-uUVkHLbRPoBLriVWZtxF1W9fshWQ2S.png"
        case "285":
          return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4A_285-UtffvByqBuhvkj8vYrX9DqdZ5kTY0D.png"
      }
    }

    return null
  }

  const bracketImage = getBracketImage()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto p-0">
        <DialogHeader className="flex flex-row items-center justify-between p-6 pb-2 border-b">
          <DialogTitle className="text-2xl font-bold">
            NCHSAA State Championships - {classification} {weightClass} lbs
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="p-6 bg-white">
          {bracketImage ? (
            <div className="flex justify-center">
              <Image
                src={bracketImage}
                alt={`${classification} ${weightClass} Tournament Bracket`}
                width={1200}
                height={800}
                className="max-w-full h-auto border border-gray-200 rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">
                Tournament bracket for {classification} {weightClass} lbs
              </div>
              <div className="text-gray-400">Bracket image coming soon</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
