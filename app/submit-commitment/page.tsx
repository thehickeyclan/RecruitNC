import { EnhancedCommitmentForm } from "@/components/enhanced-commitment-form"

export default function SubmitCommitmentPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Wrestling Commitment</h1>
          <p className="text-gray-600">Share your wrestling commitment with the NC wrestling community</p>
        </div>
        <EnhancedCommitmentForm />
      </div>
    </div>
  )
}
