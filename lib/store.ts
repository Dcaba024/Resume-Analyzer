// lib/store.ts
import { create } from 'zustand'

interface ResumeStore {
  resumeText: string
  jobDescription: string
  setResumeText: (text: string) => void
  setJobDescription: (text: string) => void
  analysis: string
  setAnalysis: (result: string) => void
  loading: boolean
  setLoading: (isLoading: boolean) => void
}

export const useResumeStore = create<ResumeStore>((set) => ({
  resumeText: '',
  jobDescription: '',
  analysis: '',
  loading: false,
  setResumeText: (text) => set({ resumeText: text }),
  setJobDescription: (text) => set({ jobDescription: text }),
  setAnalysis: (result) => set({ analysis: result }),
  setLoading: (isLoading) => set({ loading: isLoading }),
}))
