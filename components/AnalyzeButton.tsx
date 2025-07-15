'use client'

import { useResumeStore } from '../lib/store'

export default function AnalyzeButton() {
  const {
    resumeText,
    jobDescription,
    setAnalysis,
    setLoading,
    loading,
    analysis,
  } = useResumeStore()

  const handleAnalyze = async () => {
    if (!resumeText || !jobDescription) return

    setLoading(true)
    setAnalysis('')

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: resumeText, job: jobDescription }),
    })

    const data = await res.json()
    setAnalysis(data.result)
    setLoading(false)
  }

  return (
    <div className="text-center">
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-md text-white font-semibold transition-all disabled:opacity-50"
      >
        {loading ? 'Analyzing...' : 'Analyze Resume'}
      </button>

      {analysis && (
        <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-md text-left whitespace-pre-wrap text-sm">
          {analysis}
        </div>
      )}
    </div>
  )
}
