// app/api/analyze/route.ts
import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// export async function POST(req: Request) {
//   const { resume, job } = await req.json()

//   const prompt = `
// You're a career coach helping people get jobs.

// Compare this resume to the job description and give:
// 1. A match score out of 100
// 2. Suggestions for improvement
// 3. Any missing keywords or experiences

// Resume:
// ${resume}

// Job Description:
// ${job}
// `

//   try {
//     const response = await openai.chat.completions.create({
//         model: 'gpt-3.5-turbo',
//         messages: [{ role: 'user', content: prompt }],
//       })
      

//     const result = response.choices[0].message.content
//     return NextResponse.json({ result })
//   } catch (error) {
//     console.error(error)
//     return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 })
//   }
// }


export async function POST(req: Request) {
    const { resume, job } = await req.json()
  
    // Simulate a fake analysis result
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
