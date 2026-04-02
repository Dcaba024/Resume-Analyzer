'use client'

import { useEffect, useRef, useState } from 'react'
import { useResumeStore } from '../lib/store'
import {
  downloadResumeAsPdf,
  downloadCoverLetterAsPdf,
} from '../lib/resumeDownload'

type AnalyzeButtonProps = {
  fullName?: string | null
}

type ResumePreviewSection = {
  heading: string
  lines: string[]
}

function isResumeHeading(line: string) {
  return /^(summary|core skills|skills|professional experience|experience|projects|education|certifications|additional details|additional information)$/i.test(
    line.trim()
  )
}

function parseResumePreview(resume: string) {
  const lines = resume.split(/\r?\n/)
  const headerLines: string[] = []
  const sections: ResumePreviewSection[] = []
  let currentSection: ResumePreviewSection | null = null
  let seenSection = false

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, '')
    const trimmed = line.trim()

    if (!trimmed) {
      if (currentSection && currentSection.lines[currentSection.lines.length - 1] !== '') {
        currentSection.lines.push('')
      }
      continue
    }

    if (isResumeHeading(trimmed)) {
      seenSection = true
      currentSection = {
        heading: trimmed.toUpperCase(),
        lines: [],
      }
      sections.push(currentSection)
      continue
    }

    if (!seenSection) {
      headerLines.push(trimmed)
      continue
    }

    if (!currentSection) {
      currentSection = {
        heading: 'EXPERIENCE',
        lines: [],
      }
      sections.push(currentSection)
    }

    currentSection.lines.push(line)
  }

  return {
    headerLines,
    sections: sections.map((section) => ({
      ...section,
      lines: section.lines.filter((line, index, source) => {
        if (line !== '') return true
        return source[index - 1] !== '' && source[index + 1] !== ''
      }),
    })),
  }
}

export default function AnalyzeButton({ fullName }: AnalyzeButtonProps) {
  const [copied, setCopied] = useState(false)
  const [coverCopied, setCoverCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [coverDownloading, setCoverDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [coverDownloadError, setCoverDownloadError] = useState<string | null>(
    null
  )
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const {
    resumeText,
    jobDescription,
    setAnalysis,
    setRewrittenResume,
    setDownloadableResume,
    setCoverLetter,
    setValidationSummary,
    setImprovedMatchScore,
    setBaselineMatchScore,
    setJudgeReason,
    setAgentReports,
    setLoading,
    loading,
    analysis,
    rewrittenResume,
    downloadableResume,
    coverLetter,
    validationSummary,
    improvedMatchScore,
    baselineMatchScore,
    judgeReason,
    agentReports,
  } = useResumeStore()
  const resumePreview = rewrittenResume ? parseResumePreview(rewrittenResume) : null

  useEffect(() => {
    return () => {
      clearProgressTimers()
    }
  }, [])

  const clearProgressTimers = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current)
      completionTimerRef.current = null
    }
  }

  const startProgress = () => {
    clearProgressTimers()
    setProgress(5)
    setProgressLabel('Analyzing resume and job description...')
    progressTimerRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 85) return current
        return current + 3
      })
    }, 500)
  }

  const completeProgress = (success: boolean) => {
    clearProgressTimers()
    if (success) {
      setProgress(100)
      setProgressLabel('Complete')
      completionTimerRef.current = setTimeout(() => {
        setProgress(0)
        setProgressLabel('')
      }, 1800)
    } else {
      completionTimerRef.current = setTimeout(() => {
        setProgress(0)
        setProgressLabel('')
      }, 2500)
    }
  }

  const handleAnalyze = async () => {
    if (!resumeText || !jobDescription) return

    setLoading(true)
    startProgress()
    setAnalysis('')
    setRewrittenResume('')
    setDownloadableResume('')
    setCoverLetter('')
    setValidationSummary('')
    setImprovedMatchScore(null)
    setBaselineMatchScore(null)
    setJudgeReason(null)
    setAgentReports([])
    setDownloadError(null)
    setCoverDownloadError(null)

    let success = false
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
      setProgress(90)
      setProgressLabel('Validating ATS formatting & scores...')
      setAnalysis(data.analysis ?? data.result ?? '')
      setRewrittenResume(data.rewrittenResume ?? '')
      setDownloadableResume(data.downloadableResume ?? data.rewrittenResume ?? '')
      setCoverLetter(data.coverLetter ?? '')
      setValidationSummary(data.validationSummary ?? '')
      setImprovedMatchScore(
        typeof data.improvedMatchScore === 'number'
          ? data.improvedMatchScore
          : null
      )
      setBaselineMatchScore(
        typeof data.baselineMatchScore === 'number'
          ? data.baselineMatchScore
          : null
      )
      setJudgeReason(
        typeof data.judgeReason === 'string' && data.judgeReason.trim()
          ? data.judgeReason
          : null
      )
      setAgentReports(
        Array.isArray(data.agentReports)
          ? data.agentReports.filter(
              (report: unknown): report is { name: string; summary: string } =>
                Boolean(
                  report &&
                    typeof report === 'object' &&
                    'name' in report &&
                    'summary' in report &&
                    typeof report.name === 'string' &&
                    typeof report.summary === 'string'
                )
            )
          : []
      )
      success = true
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to analyze resume.'
      setAnalysis(`❌ ${message}`)
      setRewrittenResume('')
      setDownloadableResume('')
      setCoverLetter('')
      setValidationSummary('')
      setImprovedMatchScore(null)
      setBaselineMatchScore(null)
      setJudgeReason(null)
      setAgentReports([])
      setProgressLabel('Analysis failed. Please try again.')
    } finally {
      completeProgress(success)
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
    const resumeForDownload = downloadableResume || rewrittenResume
    if (!resumeForDownload) return
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadResumeAsPdf(resumeForDownload, fullName)
    } catch (error) {
      console.error('Failed to download resume PDF', error)
      setDownloadError('Unable to generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyCoverLetter = async () => {
    if (!coverLetter) return
    try {
      await navigator.clipboard.writeText(coverLetter)
      setCoverCopied(true)
      setTimeout(() => setCoverCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy cover letter', error)
    }
  }

  const handleDownloadCoverLetter = async () => {
    if (!coverLetter) return
    setCoverDownloadError(null)
    setCoverDownloading(true)
    try {
      await downloadCoverLetterAsPdf(coverLetter, fullName)
    } catch (error) {
      console.error('Failed to download cover letter PDF', error)
      setCoverDownloadError('Unable to generate PDF. Please try again.')
    } finally {
      setCoverDownloading(false)
    }
  }

  return (
    <div className="text-center">
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-md text-white font-semibold transition-all disabled:opacity-50"
      >
        {loading
          ? `Analyzing${
              progress ? ` (${Math.min(progress, 99).toFixed(0)}%)` : '...'
            }`
          : 'Analyze Resume'}
      </button>

      {(loading || progress > 0) && (
        <div className="mt-3 text-left">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{progressLabel}</span>
            <span>{progress ? `${Math.min(progress, 100).toFixed(0)}%` : ''}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-800">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all duration-200"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {analysis && (
        <div className="mt-6 rounded-md border border-gray-700 bg-gray-900 p-4 text-left text-sm whitespace-pre-wrap">
          {analysis}
        </div>
      )}

      {agentReports.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-700 bg-gray-900 p-4 text-left text-sm text-gray-100">
          <h3 className="text-base font-semibold text-white">
            AI Agent Insights
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {agentReports.map((report) => (
              <div
                key={report.name}
                className="rounded-lg border border-gray-800 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wide text-blue-300">
                  {report.name}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">
                  {report.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(validationSummary || baselineMatchScore !== null || improvedMatchScore !== null) && (
        <div className="mt-6 rounded-xl border border-gray-700 bg-gray-900 p-4 text-left text-sm text-gray-100">
          <h3 className="text-base font-semibold text-white">
            ATS Validation & Match Score
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-800 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Original Match Score
              </p>
              <p className="text-2xl font-semibold text-white">
                {baselineMatchScore !== null ? `${baselineMatchScore} / 100` : '––'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                New Match Score
              </p>
              <p className="text-2xl font-semibold text-white">
                {improvedMatchScore !== null ? `${improvedMatchScore} / 100` : '––'}
              </p>
            </div>
          </div>
          {validationSummary && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-gray-300">
              {validationSummary}
            </p>
          )}
          {judgeReason && (
            <div className="mt-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-red-300">
                Judge: Why It Cannot Reach 75/100
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-red-200">
                {judgeReason}
              </p>
            </div>
          )}
        </div>
      )}

      {rewrittenResume && (
        <div className="mt-6 space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-4 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-white">Updated Resume</h3>
              <p className="text-xs text-gray-400 sm:text-sm">
                Recruiter-style preview with cleaner spacing and section hierarchy.
              </p>
            </div>
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
          {resumePreview ? (
            <div className="overflow-hidden rounded-3xl border border-stone-300 bg-stone-50 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10 sm:py-10 text-stone-900">
                {resumePreview.headerLines.length > 0 && (
                  <header className="border-b border-stone-300 pb-5 text-center">
                    <h4
                      className="text-3xl font-semibold tracking-[0.08em] text-stone-900"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {resumePreview.headerLines[0]}
                    </h4>
                    {resumePreview.headerLines.slice(1).map((line) => (
                      <p key={line} className="mt-2 text-sm text-stone-600">
                        {line}
                      </p>
                    ))}
                  </header>
                )}

                <div className="space-y-7 pt-6">
                  {resumePreview.sections.map((section) => (
                    <section key={section.heading}>
                      <div className="flex items-center gap-3">
                        <h5 className="text-xs font-semibold tracking-[0.28em] text-stone-700">
                          {section.heading}
                        </h5>
                        <div className="h-px flex-1 bg-stone-300" />
                      </div>
                      <div className="mt-3 space-y-2 text-[15px] leading-7 text-stone-800">
                        {section.lines.map((line, index) => {
                          if (!line.trim()) {
                            return <div key={`${section.heading}-${index}`} className="h-2" />
                          }

                          const bulletMatch = line.trim().match(/^[•-]\s+(.*)$/)
                          if (bulletMatch) {
                            return (
                              <div
                                key={`${section.heading}-${index}`}
                                className="flex items-start gap-3"
                              >
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-stone-500" />
                                <p>{bulletMatch[1]}</p>
                              </div>
                            )
                          }

                          return <p key={`${section.heading}-${index}`}>{line.trim()}</p>
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
              {rewrittenResume}
            </pre>
          )}
        </div>
      )}

      {coverLetter && (
        <div className="mt-6 space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-4 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:max-w-md">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Tailored Cover Letter
              </h3>
              <p className="text-xs text-gray-400 sm:text-sm">
                Keyword-rich letter matched to the job description and ATS-safe.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <button
                type="button"
                onClick={handleCopyCoverLetter}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-gray-600 px-4 py-2 text-sm font-medium text-white transition hover:border-gray-400"
              >
                {coverCopied ? 'Copied!' : 'Copy Letter'}
              </button>
              <button
                type="button"
                onClick={handleDownloadCoverLetter}
                disabled={coverDownloading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-blue-400 disabled:opacity-60"
              >
                {coverDownloading ? 'Preparing PDF...' : 'Download PDF'}
              </button>
            </div>
          </div>
          {coverDownloadError && (
            <p className="text-sm text-red-400">{coverDownloadError}</p>
          )}
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
            {coverLetter}
          </pre>
        </div>
      )}
    </div>
  )
}
