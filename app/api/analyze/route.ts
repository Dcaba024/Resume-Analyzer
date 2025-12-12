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
  coverLetter: string;
};

type ValidationResult = {
  validationSummary: string;
  improvedMatchScore: number | null;
  passesValidation: boolean;
};

export async function POST(req: Request) {
  const { resumeText, jobDescription } = await req.json();

  const sanitizedResumeText = sanitizeMultilineInput(resumeText);
  const sanitizedJobDescription = sanitizeMultilineInput(jobDescription);

  if (!sanitizedResumeText || !sanitizedJobDescription) {
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

  let analysisResponse = await generateAnalysis(
    sanitizedResumeText,
    sanitizedJobDescription
  );

  const baselineMatchScore =
    extractMatchScore(analysisResponse.analysis) ??
    calculateMatchScore(sanitizedResumeText, sanitizedJobDescription);

  let validationResult = await validateRewrittenResume(
    analysisResponse.rewrittenResume,
    sanitizedJobDescription,
    baselineMatchScore
  );

  const maxAttempts = openai ? 3 : 1;
  let attempts = 0;

  while (!validationResult.passesValidation && attempts < maxAttempts && openai) {
    attempts++;
    analysisResponse = await generateAnalysis(
      sanitizedResumeText,
      sanitizedJobDescription,
      { enforcePlainText: true }
    );
    validationResult = await validateRewrittenResume(
      analysisResponse.rewrittenResume,
      sanitizedJobDescription,
      baselineMatchScore
    );
  }

  if (!validationResult.passesValidation) {
    return NextResponse.json(
      {
        error:
          "Unable to generate a validated ATS resume. Please try again with a slightly different prompt.",
      },
      { status: 500 }
    );
  }

  if (!membershipActive) {
    await decrementUserCredit(user.email);
  }

  return NextResponse.json({
    analysis: analysisResponse.analysis,
    rewrittenResume: analysisResponse.rewrittenResume,
    coverLetter: analysisResponse.coverLetter,
    validationSummary: validationResult.validationSummary,
    improvedMatchScore: validationResult.improvedMatchScore,
    baselineMatchScore,
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
      if (parsed.analysis && parsed.rewrittenResume && parsed.coverLetter) {
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

async function generateAnalysis(
  resumeText: string,
  jobDescription: string,
  options?: { enforcePlainText?: boolean }
): Promise<AnalysisResponse> {
  if (openai) {
    const prompt = buildAnalysisPrompt(
      resumeText,
      jobDescription,
      Boolean(options?.enforcePlainText)
    );

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      const content = completion.choices[0].message?.content;
      const parsed = parseAnalysisResponse(content);
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      console.error("OpenAI analysis error:", error);
    }
  }

  return buildMockAnalysis(resumeText, jobDescription);
}

function buildAnalysisPrompt(
  resumeText: string,
  jobDescription: string,
  enforcePlainText: boolean
) {
  const formattingReminder = enforcePlainText
    ? "Ensure the very first lines contain candidate name + contact info (email and phone). Output plain ASCII text only, with standard resume sections and no placeholder text."
    : "Keep formatting ATS-friendly with clean ASCII text and conventional sections.";

  return `
You are a professional technical resume evaluator with deep knowledge of ATS (Applicant Tracking Systems).
Compare the following RESUME and JOB DESCRIPTION.

Return a JSON object with the following keys:
- "analysis": string containing sections (Match Score, Strengths, Weaknesses, Missing Keywords, Suggestions, ATS Optimization Tips). Use plain text headings separated by newlines. Do not use Markdown symbols like ** or hyphenated bullets.
- "rewrittenResume": a full resume draft that the user can copy/paste. Use uppercase section headings (SUMMARY, CORE SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION, ADDITIONAL DETAILS) and bullet characters like "•" for accomplishments. ${formattingReminder}
- "coverLetter": a concise 3-4 paragraph cover letter tailored to the JOB DESCRIPTION, mirroring critical keywords, referencing measurable impact, and staying ATS-friendly plain text.

Ensure the rewritten resume and cover letter align closely with the job description language.

--- RESUME ---
${resumeText}

--- JOB DESCRIPTION ---
${jobDescription}
`;
}

function buildMockAnalysis(
  resumeText: string,
  jobDescription: string
): AnalysisResponse {
  const { score, matchedKeywords, missingKeywords } = calculateScoreAndGaps(
    resumeText,
    jobDescription
  );

  const analysis = `Match Score: ${score} / 100

Strengths:
• Your resume already mentions ${matchedKeywords.slice(0, 5).join(", ") ||
    "the core keywords pulled from the job description"}.
• Format appears ATS-friendly (text-based PDF, clear sections).
• Experience aligns with the responsibilities listed in the role.

Weaknesses:
• Critical keywords are underrepresented; mirror the job's terminology more directly.
• Quantifiable accomplishments can be highlighted earlier in each role.

Missing Keywords:
${missingKeywords.length ? missingKeywords.join(", ") : "All primary keywords detected in your resume."}

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
    rewrittenResume: buildRewrittenResume(missingKeywords),
    coverLetter: buildCoverLetter(jobDescription, missingKeywords),
  };
}

function buildRewrittenResume(missingKeywords: string[]): string {
  const skillsLine = missingKeywords.length
    ? `CORE SKILLS\n${missingKeywords.join(", ")}`
    : `CORE SKILLS\nTailor this list with the strongest tools, platforms, and competencies from the job description.`;

  return `ALEX APPLICANT
New York, NY • alex.applicant@email.com • (555) 555-1234 • linkedin.com/in/alexapplicant

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

function buildCoverLetter(
  jobDescription: string,
  missingKeywords: string[]
): string {
  const role = inferRoleFromJobDescription(jobDescription);
  const keywordHighlights =
    missingKeywords.slice(0, 6).join(", ") ||
    "the high-priority skills highlighted in the job description";

  return `Dear Hiring Manager,

I am excited to apply for the ${role} and bring a track record of delivering measurable outcomes across fast-paced teams. My experience mirrors the scope of your role—translating requirements into polished deliverables, partnering cross-functionally, and keeping documentation clean for ATS workflows.

In my recent positions I aligned roadmaps with stakeholder goals, optimized processes, and showcased metrics-driven wins while working with ${keywordHighlights}. I take pride in maintaining clear communication, elevating team performance, and ensuring every project reflects the voice of the customer.

I would welcome the chance to share how this approach can help ${role} initiatives exceed expectations. Thank you for your time and consideration.

Sincerely,
Alex Applicant`;
}

async function validateRewrittenResume(
  rewrittenResume: string,
  jobDescription: string,
  baselineMatchScore: number | null
): Promise<ValidationResult> {
  if (!rewrittenResume.trim()) {
    return {
      validationSummary:
        "Unable to validate because the rewritten resume is empty. Please re-run the analysis.",
      improvedMatchScore: baselineMatchScore,
      passesValidation: false,
    };
  }

  if (openai) {
    const prompt = `
You are an ATS resume auditor. Review the UPDATED RESUME below and ensure it follows these requirements:
- Uses plain text (ASCII) with standard resume formatting (no tables or decorative characters).
- Begins with the candidate name and contact info (email + phone or location).
- Includes conventional sections (Summary, Skills, Experience, Education).
- Contains measurable achievements aligned to the job description.

Also, compare the UPDATED RESUME to the JOB DESCRIPTION and provide a new match score from 0-100.
The baseline match score for the original resume was ${
      baselineMatchScore ?? "unknown"
    }.

Return a JSON object with:
- "validationSummary": short paragraph noting if the resume meets formatting/contact requirements, calling out any fixes needed, and referencing ATS readiness. Plain text only.
- "improvedMatchScore": integer 0-100 representing how well the UPDATED RESUME now matches the JOB DESCRIPTION.
- "passesValidation": boolean true/false indicating whether the resume satisfies all ATS formatting/contact requirements above.

--- UPDATED RESUME ---
${rewrittenResume}

--- JOB DESCRIPTION ---
${jobDescription}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      const content = completion.choices[0].message?.content;
      const parsed = parseValidationResponse(content);
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      console.error("OpenAI validation error:", error);
    }
  }

  return buildMockValidation(rewrittenResume, jobDescription);
}

function parseValidationResponse(
  content?: string | null
): ValidationResult | null {
  if (!content) return null;
  const tryParse = (value: string) => {
    try {
      const parsed = JSON.parse(value) as ValidationResult;
      if (
        parsed.validationSummary &&
        "improvedMatchScore" in parsed &&
        typeof parsed.passesValidation === "boolean"
      ) {
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

function buildMockValidation(
  rewrittenResume: string,
  jobDescription: string
): ValidationResult {
  const containsNonAscii = /[^\x09\x0A\x0D\x20-\x7E]/.test(rewrittenResume);
  const hasPlaceholder = /NAME HERE/i.test(rewrittenResume);
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(
    rewrittenResume
  );
  const hasPhone = /(\+?\d[\d\s().-]{7,})/.test(rewrittenResume);
  const issues: string[] = [];

  if (containsNonAscii) {
    issues.push("Remove decorative or non-ASCII characters for ATS parsing.");
  }
  if (hasPlaceholder) {
    issues.push("Replace placeholder text like 'NAME HERE' with your details.");
  }
  if (!hasEmail || !hasPhone) {
    issues.push("Include both an email address and phone number in the header.");
  }

  const { score } = calculateScoreAndGaps(rewrittenResume, jobDescription);

  const summary = issues.length
    ? `Needs attention: ${issues.join(" ")}`
    : "Resume formatting, contact details, and keyword alignment look ATS-ready.";

  return {
    validationSummary: summary,
    improvedMatchScore: score,
    passesValidation: issues.length === 0,
  };
}

function calculateScoreAndGaps(resumeText: string, jobDescription: string) {
  const keywords = extractKeywords(jobDescription);
  const resumeLower = resumeText.toLowerCase();
  const matchedKeywords = keywords.filter((keyword) =>
    resumeLower.includes(keyword)
  );
  const missingKeywords = keywords
    .filter((keyword) => !resumeLower.includes(keyword))
    .slice(0, 10);
  const score = keywords.length
    ? Math.min(
        100,
        Math.round(((matchedKeywords.length / keywords.length) || 0) * 100)
      )
    : 0;
  return { score, matchedKeywords, missingKeywords };
}

function calculateMatchScore(resumeText: string, jobDescription: string) {
  const { score } = calculateScoreAndGaps(resumeText, jobDescription);
  return score;
}

function extractKeywords(jobDescription: string) {
  return Array.from(
    new Set(
      jobDescription
        .toLowerCase()
        .match(/\b[a-z]{4,}\b/g)
        ?.filter((word) => !["with", "have", "this", "that", "from"].includes(word)) ??
        []
    )
  );
}

function extractMatchScore(analysis: string): number | null {
  const match = analysis.match(/Match Score:\s*(\d{1,3})/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }
  return null;
}

function sanitizeMultilineInput(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
}

function inferRoleFromJobDescription(jobDescription: string) {
  const titleMatch = jobDescription.match(
    /(title|role|position)\s*[:\-]\s*(.+)/i
  );
  if (titleMatch?.[2]) {
    return titleMatch[2].split(/\r?\n/)[0].trim();
  }

  const firstMeaningfulLine = jobDescription
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && line.length < 90);

  return firstMeaningfulLine || "this role";
}
