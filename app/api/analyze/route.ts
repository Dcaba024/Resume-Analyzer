import { NextResponse } from 'next/server'

export async function POST() {
  const fakeResult = `
📊 Match Score: 76%

✅ Strengths:
- Experience with React, which matches job requirements
- Strong frontend background
- Good project examples

🛠 Suggestions:
- Add more metrics to your resume (e.g., "Improved load time by 30%")
- Include keywords like "Agile", "TypeScript", and "CI/CD"
- Mention soft skills like communication or teamwork

🔍 Missing Keywords:
- TypeScript
- Scrum
- Accessibility
  `

  return NextResponse.json({ result: fakeResult })
}
