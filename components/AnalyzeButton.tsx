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
  const finalResume = downloadableResume || rewrittenResume
  const resumePreview = finalResume ? parseResumePreview(finalResume) : null

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
    if (!finalResume) return
    try {
      await navigator.clipboard.writeText(finalResume)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy resume', error)
    }
  }

  const handleDownloadPdf = async () => {
    if (!finalResume) return
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadResumeAsPdf(finalResume, fullName)
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
        className="w-full rounded-[1.4rem] border border-emerald-200/20 bg-[linear-gradient(135deg,#8be1d0_0%,#4cbeb0_48%,#2f7f95_100%)] px-6 py-4 text-sm font-semibold tracking-[0.08em] text-slate-950 uppercase shadow-[0_20px_60px_rgba(64,182,170,0.28)] transition duration-300 hover:translate-y-[-1px] hover:shadow-[0_26px_70px_rgba(64,182,170,0.36)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? `Analyzing${
              progress ? ` (${Math.min(progress, 99).toFixed(0)}%)` : '...'
            }`
          : 'Analyze Resume'}
      </button>

      {(loading || progress > 0) && (
        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4 text-left">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>{progressLabel}</span>
            <span>{progress ? `${Math.min(progress, 100).toFixed(0)}%` : ''}</span>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-white/8">
            <div
              className="h-2.5 rounded-full bg-[linear-gradient(90deg,#8be1d0_0%,#4cbeb0_55%,#65b7df_100%)] transition-all duration-200"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {analysis && (
        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 text-left text-sm leading-7 whitespace-pre-wrap text-slate-200">
          {analysis}
        </div>
      )}

      {agentReports.length > 0 && (
        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 text-left text-sm text-slate-100">
          <h3 className="text-base font-semibold text-white">
            AI Agent Insights
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {agentReports.map((report) => (
              <div
                key={report.name}
                className="rounded-[1.25rem] border border-white/8 bg-[rgba(6,16,24,0.7)] px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
                  {report.name}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {report.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(validationSummary || baselineMatchScore !== null || improvedMatchScore !== null) && (
        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 text-left text-sm text-slate-100">
          <h3 className="text-base font-semibold text-white">
            ATS Validation & Match Score
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-white/8 bg-[rgba(6,16,24,0.72)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Original Match Score
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {baselineMatchScore !== null ? `${baselineMatchScore} / 100` : '––'}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-emerald-300/12 bg-[linear-gradient(180deg,rgba(125,211,199,0.12),rgba(6,16,24,0.76))] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                New Match Score
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {improvedMatchScore !== null ? `${improvedMatchScore} / 100` : '––'}
              </p>
            </div>
          </div>
          {validationSummary && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {validationSummary}
            </p>
          )}
          {judgeReason && (
            <div className="mt-4 rounded-[1.3rem] border border-rose-300/14 bg-[rgba(63,11,21,0.56)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-rose-200">
                Judge: Why It Cannot Reach 75/100
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-rose-100/90">
                {judgeReason}
              </p>
            </div>
          )}
        </div>
      )}

      {finalResume && (
        <div className="mt-6 space-y-4 rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-white">Updated Resume</h3>
              <p className="text-xs text-slate-400 sm:text-sm">
                Refined preview with cleaner typography, calmer spacing, and a clearer hierarchy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyResume}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:border-[var(--accent)] hover:bg-[rgba(125,211,199,0.08)]"
              >
                {copied ? 'Copied!' : 'Copy Resume'}
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="inline-flex items-center justify-center rounded-full border border-emerald-300/20 bg-[rgba(125,211,199,0.12)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(125,211,199,0.2)] disabled:opacity-60"
              >
                {downloading ? 'Preparing PDF...' : 'Download PDF'}
              </button>
            </div>
          </div>
          {downloadError && (
            <p className="text-sm text-rose-300">{downloadError}</p>
          )}
          {resumePreview ? (
            <div className="overflow-hidden rounded-[2rem] border border-[#d8e5ec] bg-[#f5f7f4] shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
              <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10 sm:py-10 text-[#172129]">
                {resumePreview.headerLines.length > 0 && (
                  <header className="border-b border-[#c9d7de] pb-5 text-center">
                    <h4
                      className="text-3xl font-semibold tracking-[0.04em] text-[#132028]"
                      style={{ fontFamily: 'var(--font-sora), sans-serif' }}
                    >
                      {resumePreview.headerLines[0]}
                    </h4>
                    {resumePreview.headerLines.slice(1).map((line) => (
                      <p key={line} className="mt-2 text-sm text-[#61717b]">
                        {line}
                      </p>
                    ))}
                  </header>
                )}

                <div className="space-y-7 pt-6">
                  {resumePreview.sections.map((section) => (
                    <section key={section.heading}>
                      <div className="flex items-center gap-3">
                        <h5 className="text-xs font-semibold tracking-[0.28em] text-[#47626f]">
                          {section.heading}
                        </h5>
                        <div className="h-px flex-1 bg-[#c9d7de]" />
                      </div>
                      <div className="mt-3 space-y-2 text-[15px] leading-7 text-[#22313a]">
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
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#4ea596]" />
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
            <pre className="whitespace-pre-wrap rounded-[1.5rem] border border-white/8 bg-[rgba(4,12,20,0.72)] p-5 text-sm leading-7 text-slate-100">
              {finalResume}
            </pre>
          )}
        </div>
      )}

      {coverLetter && (
        <div className="mt-6 space-y-4 rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:max-w-md">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Tailored Cover Letter
              </h3>
              <p className="text-xs text-slate-400 sm:text-sm">
                Keyword-rich letter matched to the job description and ATS-safe.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <button
                type="button"
                onClick={handleCopyCoverLetter}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:border-[var(--accent)] hover:bg-[rgba(125,211,199,0.08)]"
              >
                {coverCopied ? 'Copied!' : 'Copy Letter'}
              </button>
              <button
                type="button"
                onClick={handleDownloadCoverLetter}
                disabled={coverDownloading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-emerald-300/20 bg-[rgba(125,211,199,0.12)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(125,211,199,0.2)] disabled:opacity-60"
              >
                {coverDownloading ? 'Preparing PDF...' : 'Download PDF'}
              </button>
            </div>
          </div>
          {coverDownloadError && (
            <p className="text-sm text-rose-300">{coverDownloadError}</p>
          )}
          <pre className="whitespace-pre-wrap rounded-[1.5rem] border border-white/8 bg-[rgba(4,12,20,0.72)] p-5 text-sm leading-7 text-slate-100">
            {coverLetter}
          </pre>
        </div>
      )}
    </div>
  )
}
