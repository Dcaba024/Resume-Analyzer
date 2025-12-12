// lib/store.ts
import { create } from 'zustand'

interface ResumeStore {
  resumeText: string
  jobDescription: string
  setResumeText: (text: string) => void
  setJobDescription: (text: string) => void
  analysis: string
  setAnalysis: (result: string) => void
  rewrittenResume: string
  setRewrittenResume: (text: string) => void
  coverLetter: string
  setCoverLetter: (text: string) => void
  validationSummary: string
  setValidationSummary: (text: string) => void
  improvedMatchScore: number | null
  setImprovedMatchScore: (score: number | null) => void
  baselineMatchScore: number | null
  setBaselineMatchScore: (score: number | null) => void
  loading: boolean
  setLoading: (isLoading: boolean) => void
}

export const useResumeStore = create<ResumeStore>((set) => ({
  resumeText: '',
  jobDescription: '',
  analysis: '',
  rewrittenResume: '',
  coverLetter: '',
  validationSummary: '',
  improvedMatchScore: null,
  baselineMatchScore: null,
  loading: false,
  setResumeText: (text) => set({ resumeText: text }),
  setJobDescription: (text) => set({ jobDescription: text }),
  setAnalysis: (result) => set({ analysis: result }),
  setRewrittenResume: (text) => set({ rewrittenResume: text }),
  setCoverLetter: (text) => set({ coverLetter: text }),
  setValidationSummary: (text) => set({ validationSummary: text }),
  setImprovedMatchScore: (score) => set({ improvedMatchScore: score }),
  setBaselineMatchScore: (score) => set({ baselineMatchScore: score }),
  setLoading: (isLoading) => set({ loading: isLoading }),
}))
