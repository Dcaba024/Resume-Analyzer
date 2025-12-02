'use client'

import { useState } from 'react'
import { useResumeStore } from '../lib/store'
import { downloadResumeAsPdf } from '../lib/resumeDownload'

type AnalyzeButtonProps = {
  fullName?: string | null
}

export default function AnalyzeButton({ fullName }: AnalyzeButtonProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const {
    resumeText,
    jobDescription,
    setAnalysis,
    setRewrittenResume,
    setLoading,
    loading,
    analysis,
    rewrittenResume,
  } = useResumeStore()

  const handleAnalyze = async () => {
    if (!resumeText || !jobDescription) return

    setLoading(true)
    setAnalysis('')
    setRewrittenResume('')
    setDownloadError(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription }),
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({
          error: 'Unable to analyze resume.',
        }))
        throw new Error(error || 'Unable to analyze resume.')
      }

      const data = await res.json()
      setAnalysis(data.analysis ?? data.result ?? '')
      setRewrittenResume(data.rewrittenResume ?? '')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to analyze resume.'
      setAnalysis(`❌ ${message}`)
      setRewrittenResume('')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyResume = async () => {
    if (!rewrittenResume) return
    try {
      await navigator.clipboard.writeText(rewrittenResume)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy resume', error)
    }
  }

  const handleDownloadPdf = async () => {
    if (!rewrittenResume) return
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadResumeAsPdf(rewrittenResume, fullName)
    } catch (error) {
      console.error('Failed to download resume PDF', error)
      setDownloadError('Unable to generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
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
        <div className="mt-6 rounded-md border border-gray-700 bg-gray-900 p-4 text-left text-sm whitespace-pre-wrap">
          {analysis}
        </div>
      )}

      {rewrittenResume && (
        <div className="mt-6 space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-4 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-white">Updated Resume</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyResume}
                className="inline-flex items-center justify-center rounded-full border border-gray-600 px-4 py-2 text-sm font-medium text-white transition hover:border-gray-400"
              >
                {copied ? 'Copied!' : 'Copy Resume'}
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="inline-flex items-center justify-center rounded-full border border-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-blue-400 disabled:opacity-60"
              >
                {downloading ? 'Preparing PDF...' : 'Download PDF'}
              </button>
            </div>
          </div>
          {downloadError && (
            <p className="text-sm text-red-400">{downloadError}</p>
          )}
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
            {rewrittenResume}
          </pre>
        </div>
      )}
    </div>
  )
}
