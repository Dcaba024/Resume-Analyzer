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
  loading: boolean
  setLoading: (isLoading: boolean) => void
}

export const useResumeStore = create<ResumeStore>((set) => ({
  resumeText: '',
  jobDescription: '',
  analysis: '',
  rewrittenResume: '',
  loading: false,
  setResumeText: (text) => set({ resumeText: text }),
  setJobDescription: (text) => set({ jobDescription: text }),
  setAnalysis: (result) => set({ analysis: result }),
  setRewrittenResume: (text) => set({ rewrittenResume: text }),
  setLoading: (isLoading) => set({ loading: isLoading }),
}))
