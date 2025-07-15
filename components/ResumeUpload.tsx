'use client'

import { useResumeStore } from '../lib/store'
import { extractTextFromPDF } from '../lib/pdfParser'

export default function ResumeUpload() {
  const { resumeText, setResumeText } = useResumeStore()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const text = await extractTextFromPDF(file)
      setResumeText(text)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Upload Resume (PDF)</label>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white"
      />
      {resumeText && (
        <p className="mt-2 text-sm text-green-400">
          ✅ Resume uploaded and parsed.
        </p>
      )}
    </div>
  )
}
