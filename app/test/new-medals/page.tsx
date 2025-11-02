import { MedalIcon } from "@/components/medal-icon"

export default function TestMedalsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Medal Test Page</h1>

      <div className="grid grid-cols-3 gap-8 mb-12">
        <div className="relative bg-white p-6 rounded-lg shadow-md h-40 flex items-center justify-center">
          <MedalIcon rank={1} size="md" />
          <p className="text-xl">Gold Medal (Rank 1)</p>
        </div>

        <div className="relative bg-white p-6 rounded-lg shadow-md h-40 flex items-center justify-center">
          <MedalIcon rank={2} size="md" />
          <p className="text-xl">Silver Medal (Rank 2)</p>
        </div>

        <div className="relative bg-white p-6 rounded-lg shadow-md h-40 flex items-center justify-center">
          <MedalIcon rank={3} size="md" />
          <p className="text-xl">Bronze Medal (Rank 3)</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Size Variations</h2>
      <div className="grid grid-cols-3 gap-8">
        <div className="relative bg-white p-6 rounded-lg shadow-md h-40 flex items-center justify-center">
          <MedalIcon rank={1} size="sm" />
          <p className="text-xl">Small Size</p>
        </div>

        <div className="relative bg-white p-6 rounded-lg shadow-md h-40 flex items-center justify-center">
          <MedalIcon rank={1} size="md" />
          <p className="text-xl">Medium Size</p>
        </div>

        <div className="relative bg-white p-6 rounded-lg shadow-md h-40 flex items-center justify-center">
          <MedalIcon rank={1} size="lg" />
          <p className="text-xl">Large Size</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">Direct Image Test</h2>
      <div className="flex gap-8">
        <div>
          <p className="mb-2">Gold Medal:</p>
          <img src="/gold-medal-clean.jpeg" alt="Gold Medal" width={100} height={100} />
        </div>
        <div>
          <p className="mb-2">Silver Medal:</p>
          <img src="/silver-medal-clean.jpeg" alt="Silver Medal" width={100} height={100} />
        </div>
        <div>
          <p className="mb-2">Bronze Medal:</p>
          <img src="/bronze-medal-clean.jpeg" alt="Bronze Medal" width={100} height={100} />
        </div>
      </div>
    </div>
  )
}
