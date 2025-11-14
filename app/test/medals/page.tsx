import { MedalIcon } from "@/components/medal-icon"

export default function TestMedalsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Medal Test Page</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="relative border p-6 rounded-md">
          <MedalIcon rank={1} size="lg" />
          <h2 className="text-xl font-semibold">Gold Medal Test</h2>
          <p>This card should have a gold medal in the top-right corner.</p>
        </div>

        <div className="relative border p-6 rounded-md">
          <MedalIcon rank={2} size="lg" />
          <h2 className="text-xl font-semibold">Silver Medal Test</h2>
          <p>This card should have a silver medal in the top-right corner.</p>
        </div>

        <div className="relative border p-6 rounded-md">
          <MedalIcon rank={3} size="lg" />
          <h2 className="text-xl font-semibold">Bronze Medal Test</h2>
          <p>This card should have a bronze medal in the top-right corner.</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">Direct Image Test</h2>
        <div className="flex gap-4">
          <div>
            <p>Gold Medal:</p>
            <img src="/gold-medal.png" alt="Gold Medal" width={50} height={50} />
          </div>
          <div>
            <p>Silver Medal:</p>
            <img src="/silver-medal.png" alt="Silver Medal" width={50} height={50} />
          </div>
          <div>
            <p>Bronze Medal:</p>
            <img src="/bronze-medal.png" alt="Bronze Medal" width={50} height={50} />
          </div>
        </div>
      </div>
    </div>
  )
}
