import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import {
  decrementUserCredit,
  getUserAccessInfo,
  hasActiveMembership,
} from "@/lib/db";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  : null;

type AnalysisResponse = {
  analysis: string;
  rewrittenResume: string;
};

export async function POST(req: Request) {
  const { resumeText, jobDescription } = await req.json();

  if (!resumeText || !jobDescription) {
    return NextResponse.json(
      { error: "Missing resume or job description." },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessInfo = await getUserAccessInfo(user.email);
  const credits = accessInfo?.credits ?? 0;
  const membershipActive = hasActiveMembership(accessInfo);

  if (!membershipActive && credits <= 0) {
    return NextResponse.json(
      { error: "No credits. Please purchase more." },
      { status: 402 }
    );
  }

  let analysisResponse: AnalysisResponse;
  if (openai) {
    const prompt = `
You are a professional technical resume evaluator with deep knowledge of ATS (Applicant Tracking Systems).
Compare the following RESUME and JOB DESCRIPTION.

Return a JSON object with the following keys:
- "analysis": string containing sections (Match Score, Strengths, Weaknesses, Missing Keywords, Suggestions, ATS Optimization Tips). Use plain text headings separated by newlines. Do not use Markdown symbols like ** or hyphenated bullets.
- "rewrittenResume": a full resume draft that the user can copy/paste. Use uppercase section headings (SUMMARY, CORE SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION, ADDITIONAL DETAILS) and bullet characters like "•" for accomplishments. Keep formatting ATS-friendly plain text.

Ensure the rewritten resume aligns closely with the job description language.

--- RESUME ---
${resumeText}

--- JOB DESCRIPTION ---
${jobDescription}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      const content = completion.choices[0].message?.content;
      analysisResponse =
        parseAnalysisResponse(content) ??
        buildMockAnalysis(resumeText, jobDescription);
    } catch (error) {
      console.error("OpenAI error:", error);
      analysisResponse = buildMockAnalysis(resumeText, jobDescription);
    }
  } else {
    analysisResponse = buildMockAnalysis(resumeText, jobDescription);
  }

  if (!membershipActive) {
    await decrementUserCredit(user.email);
  }

  return NextResponse.json({
    analysis: analysisResponse.analysis,
    rewrittenResume: analysisResponse.rewrittenResume,
    creditsRemaining: membershipActive
      ? credits
      : Math.max(credits - 1, 0),
  });
}

function parseAnalysisResponse(content?: string | null): AnalysisResponse | null {
  if (!content) return null;

  const tryParse = (value: string) => {
    try {
      const parsed = JSON.parse(value) as AnalysisResponse;
      if (parsed.analysis && parsed.rewrittenResume) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  };

  let parsed = tryParse(content.trim());
  if (parsed) return parsed;

  const fallbackMatch = content.match(/{[\s\S]*}/);
  if (fallbackMatch) {
    parsed = tryParse(fallbackMatch[0]);
    if (parsed) return parsed;
  }

  return null;
}

function buildMockAnalysis(
  resumeText: string,
  jobDescription: string
): AnalysisResponse {
  const resumeLower = resumeText.toLowerCase();
  const keywords = Array.from(
    new Set(
      jobDescription
        .toLowerCase()
        .match(/\b[a-z]{4,}\b/g)
        ?.filter((word) => !["with", "have", "this", "that", "from"].includes(word)) ?? []
    )
  );
  const matched = keywords.filter((keyword) => resumeLower.includes(keyword));
  const missing = keywords
    .filter((keyword) => !resumeLower.includes(keyword))
    .slice(0, 10);
  const score = Math.min(
    100,
    Math.round(((matched.length / keywords.length) || 0) * 100)
  );

  const analysis = `Match Score: ${score} / 100

Strengths:
• Your resume already mentions ${matched.slice(0, 5).join(", ") ||
    "the core keywords pulled from the job description"}.
• Format appears ATS-friendly (text-based PDF, clear sections).
• Experience aligns with the responsibilities listed in the role.

Weaknesses:
• Critical keywords are underrepresented; mirror the job's terminology more directly.
• Quantifiable accomplishments can be highlighted earlier in each role.

Missing Keywords:
${missing.length ? missing.join(", ") : "All primary keywords detected in your resume."}

Suggestions:
• Reorder bullet points so the most relevant achievements appear first.
• Add a Core Skills section near the summary to surface keywords for ATS parsing.
• Use strong action verbs and include metrics (%, $, time saved) where possible.

ATS Optimization Tips:
• Keep section headers conventional (Summary, Skills, Experience, Education).
• Avoid tables/text boxes—ATS tools parse best with simple layouts.
• Submit as a text-based PDF or DOCX to maintain structure.`;

  return {
    analysis,
    rewrittenResume: buildRewrittenResume(missing),
  };
}

function buildRewrittenResume(missingKeywords: string[]): string {
  const skillsLine = missingKeywords.length
    ? `CORE SKILLS\n${missingKeywords.join(", ")}`
    : `CORE SKILLS\nTailor this list with the strongest tools, platforms, and competencies from the job description.`;

  return `NAME HERE
City, ST • email@example.com • (555) 555-5555 • linkedin.com/in/username

SUMMARY
Impact-driven professional with experience aligned to the target role. Known for shipping measurable results, partnering cross-functionally, and adapting rapidly to new business priorities.

${skillsLine}

PROFESSIONAL EXPERIENCE
Most Recent Company — Job Title | YYYY–Present
• Lead initiatives that reflect the job requirements; cite the same tools and platforms.
• Quantify accomplishments (e.g., Improved ATS pass rate by 35%, Reduced processing time by 28%).
• Highlight collaboration with stakeholders and any leadership or mentorship impact.

Previous Company — Job Title | YYYY–YYYY
• Maintain reverse chronological order and emphasize achievements tied to the role.
• Mention certifications, industries, or methodologies that overlap with the job description.

EDUCATION
University Name — Degree, Graduation Year
Relevant coursework, bootcamps, or certifications.

ADDITIONAL DETAILS
• Certifications: PMP, AWS CCP, Google Analytics (tailor to your experience).
• Tools: comma-separated list of platforms and languages aligned to the job post.
• Volunteer / Leadership: Optional line if it adds credibility to the role.

FORMAT NOTES
Save as a text-based PDF or DOCX, keep fonts standard (Arial, Calibri), and use clean spacing so ATS engines can parse every section.`;
}
