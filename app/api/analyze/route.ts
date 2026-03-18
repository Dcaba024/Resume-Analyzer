import { NextResponse } from "next/server";
import {
  Agent,
  Runner,
  getGlobalTraceProvider,
  setDefaultOpenAITracingExporter,
  tool,
} from "@openai/agents";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  decrementUserCredit,
  getUserAccessInfo,
  hasActiveMembership,
} from "@/lib/db";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4o-mini";

let tracingConfigured = false;

type AgentReport = {
  name: string;
  summary: string;
};

type CandidateProfile = {
  originalName: string | null;
  originalEmail: string | null;
  originalPhone: string | null;
};

type AnalysisToolkit = {
  inferredRole: string;
  extractedKeywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  baselineScore: number;
  topKeywordMatches: string[];
};

type ResumeBlueprint = {
  candidateProfile: CandidateProfile;
  sectionOrder: string[];
  headingLines: string[];
  bulletStyle: "dash" | "bullet" | "mixed" | "none";
  sampleBodyLines: string[];
  layoutTemplate: string;
};

type ValidationResult = {
  validationSummary: string;
  improvedMatchScore: number | null;
  passesValidation: boolean;
};

type FinalAgentOutput = {
  analysis: string;
  rewrittenResume: string;
  downloadableResume: string;
  coverLetter: string;
  validationSummary: string;
  improvedMatchScore: number | null;
  agentReports: AgentReport[];
};

const agentReportSchema = z.object({
  name: z.string(),
  summary: z.string(),
});

const finalOutputSchema = z.object({
  analysis: z.string(),
  rewrittenResume: z.string(),
  downloadableResume: z.string(),
  coverLetter: z.string(),
  validationSummary: z.string(),
  improvedMatchScore: z.number().nullable(),
  agentReports: z.array(agentReportSchema),
});

const coverLetterPublisherSchema = z.object({
  coverLetter: z.string(),
});

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
  if (!user?.email) {
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

  const candidateProfile = buildCandidateProfile(
    sanitizedResumeText,
    user.email,
    accessInfo?.firstName ?? null,
    accessInfo?.lastName ?? null
  );
  const toolkit = buildAnalysisToolkit(
    sanitizedResumeText,
    sanitizedJobDescription
  );
  const resumeBlueprint = buildResumeBlueprint(
    sanitizedResumeText,
    candidateProfile
  );
  const baselineMatchScore = toolkit.baselineScore;

  ensureTracingConfigured();
  const traceGroupId = `resume-analysis-${Date.now()}`;

  const finalOutput = await runRecruiterWorkflow(
    sanitizedResumeText,
    sanitizedJobDescription,
    candidateProfile,
    toolkit,
    resumeBlueprint,
    traceGroupId
  );

  if (!membershipActive) {
    await decrementUserCredit(user.email);
  }

  return NextResponse.json({
    analysis: finalOutput.analysis,
    rewrittenResume: finalOutput.rewrittenResume,
    downloadableResume: finalOutput.downloadableResume,
    coverLetter: finalOutput.coverLetter,
    agentReports: finalOutput.agentReports,
    validationSummary: finalOutput.validationSummary,
    improvedMatchScore: finalOutput.improvedMatchScore,
    baselineMatchScore,
    creditsRemaining: membershipActive ? credits : Math.max(credits - 1, 0),
  });
}

function ensureTracingConfigured() {
  if (tracingConfigured || !OPENAI_API_KEY) {
    return;
  }

  setDefaultOpenAITracingExporter();
  tracingConfigured = true;
}

async function runRecruiterWorkflow(
  resumeText: string,
  jobDescription: string,
  candidateProfile: CandidateProfile,
  toolkit: AnalysisToolkit,
  resumeBlueprint: ResumeBlueprint,
  traceGroupId: string
): Promise<FinalAgentOutput> {
  if (!OPENAI_API_KEY) {
    return buildFallbackOutput(
      resumeText,
      jobDescription,
      candidateProfile,
      toolkit
    );
  }

  const prompt = `
You are the single head Recruiter Agent for a resume analyzer.
You are given deterministic candidate identity, original resume layout, and job-fit data computed by the application. Use that data directly and return the final answer in one pass.

Your job:
1. Produce the final analysis, rewritten resume, and cover letter in one pass.
2. Never invent qualifications, achievements, certifications, tools, domains, industries, or stakeholder experience that are not supported by the original resume.

Mandatory rules:
- The downloadable resume must contain only final resume content, never coaching notes or advice.
- Do not use markdown or decorative formatting characters such as \`*\`, \`_\`, \`#\`, or backticks in the downloadable resume or cover letter.
- Keep the rewritten resume ATS-safe plain text with standard headings.
- Make the rewritten resume presentable to recruiters and hiring managers, not just ATS systems.
- The resume should read like a polished final document: concise summary, clear technical skills section when source-backed, clean section order, strong accomplishment wording, and no awkward filler.
- Include a short professional summary when the source resume supports one. Keep it concise, specific, and keyword-relevant.
- Include a technical skills or core skills section when the source resume contains source-backed tools, languages, frameworks, platforms, or technologies.
- Do not remove an existing summary or skills section unless the source resume clearly lacks the information to support it.
- Prefer sharp, professional bullet language with outcomes, scope, and technologies when supported by the source resume.
- Avoid generic phrases like "candidate with experience relevant to" when a stronger professional summary can be written honestly.
- Preserve the source resume's section order, heading style, and overall layout hierarchy when the original structure is clear.
- Omit unsupported sections instead of filling them with placeholders or suggestions.
- Preserve the candidate's real name, email, and phone when available.
- Even for a poor-fit role, the rewritten resume should look polished, specific, and genuinely useful for adjacent roles.

Return JSON only matching the required schema.

Candidate identity snapshot:
${JSON.stringify(candidateProfile, null, 2)}

Resume layout blueprint:
${JSON.stringify(resumeBlueprint, null, 2)}

Deterministic job analysis:
${JSON.stringify(toolkit, null, 2)}

Original resume:
${resumeText}

Job description:
${jobDescription}
`;

  try {
    const runner = new Runner({
      model: MODEL,
      modelSettings: {
        maxTokens: 2200,
        text: { verbosity: "medium" },
      },
      workflowName: "Resume Analyzer",
      groupId: traceGroupId,
      traceIncludeSensitiveData: true,
      traceMetadata: {
        app: "resume-analyzer",
        step: "Recruiter Agent",
      },
    });

    const agent = new Agent({
      name: "Recruiter Agent",
      instructions:
        "Return only valid JSON matching the required output schema. Do not call tools. Use the provided deterministic identity, blueprint, and job-analysis context directly.",
      model: MODEL,
      outputType: finalOutputSchema,
    });

    const result = await runner.run(agent, prompt, { maxTurns: 1 });
    const finalOutput = result.finalOutput as FinalAgentOutput;
    const normalized = normalizeFinalOutput(
      finalOutput,
      resumeText,
      jobDescription,
      candidateProfile,
      toolkit
    );
    const downloadableResume = await runResumeMakerWorkflow(
      resumeText,
      normalized.rewrittenResume,
      candidateProfile,
      resumeBlueprint,
      traceGroupId
    );
    const coverLetter = await runCoverLetterPublisherWorkflow(
      normalized.coverLetter,
      normalized.rewrittenResume,
      jobDescription,
      candidateProfile,
      traceGroupId
    );
    return {
      ...normalized,
      downloadableResume,
      coverLetter,
      agentReports: appendOrReplaceAgentReport(normalized.agentReports, {
        name: "Cover Letter Publisher",
        summary:
          "Final cover letter pass completed for grammar, punctuation, tone, and presentation.",
      }),
    };
  } catch (error) {
    console.error("OpenAI recruiter workflow error:", error);
    return buildFallbackOutput(
      resumeText,
      jobDescription,
      candidateProfile,
      toolkit
    );
  } finally {
    await getGlobalTraceProvider().forceFlush();
  }
}

function normalizeFinalOutput(
  output: FinalAgentOutput,
  originalResumeText: string,
  jobDescription: string,
  candidateProfile: CandidateProfile,
  toolkit: AnalysisToolkit
): FinalAgentOutput {
  let rewrittenResume = sanitizeGeneratedDocument(
    applyCandidateProfileToResume(output.rewrittenResume, candidateProfile)
  );
  rewrittenResume = enforceResumeQuality(
    rewrittenResume,
    originalResumeText,
    jobDescription,
    candidateProfile,
    toolkit
  );
  const coverLetter = sanitizeGeneratedDocument(
    applyCandidateProfileToCoverLetter(output.coverLetter, candidateProfile)
  );
  const validation = buildMockValidation(
    rewrittenResume,
    jobDescription,
    candidateProfile
  );

  if (isWeakResumeDraft(rewrittenResume)) {
    rewrittenResume = buildFallbackResume(
      originalResumeText,
      jobDescription,
      candidateProfile,
      toolkit
    );
  }

  return {
    analysis: output.analysis,
    rewrittenResume,
    downloadableResume: rewrittenResume,
    coverLetter,
    validationSummary: output.validationSummary || validation.validationSummary,
    improvedMatchScore:
      output.improvedMatchScore ?? validation.improvedMatchScore,
    agentReports:
      output.agentReports.length > 0
        ? output.agentReports
        : buildDefaultAgentReports(toolkit, validation.validationSummary),
  };
}

function buildFallbackOutput(
  resumeText: string,
  jobDescription: string,
  candidateProfile: CandidateProfile,
  toolkit: AnalysisToolkit
): FinalAgentOutput {
  const analysis = `Match Score: ${toolkit.baselineScore} / 100

Strengths:
- Your resume already mentions ${
    toolkit.topKeywordMatches.slice(0, 5).join(", ") ||
    "some of the core terms found in the job description"
  }.
- Format appears text-based and easy for ATS systems to parse.

Weaknesses:
- Several job-specific keywords are missing or underused.
- The current resume may not support all of the role requirements.

Missing Keywords:
${
  toolkit.missingKeywords.length
    ? toolkit.missingKeywords.join(", ")
    : "All primary keywords detected in your resume."
}

Suggestions:
- Reorder existing, truthful experience to foreground the most relevant work.
- Mirror the job language only where the original resume supports it.
- Remove unsupported details instead of filling gaps with generic advice.

ATS Optimization Tips:
- Use conventional headings like SUMMARY, CORE SKILLS, EXPERIENCE, and EDUCATION.
- Avoid tables, icons, and multi-column layouts.
- Save as a text-based PDF or DOCX.`;

  const rewrittenResume = buildFallbackResume(
    resumeText,
    jobDescription,
    candidateProfile,
    toolkit
  );
  const validation = buildMockValidation(
    rewrittenResume,
    jobDescription,
    candidateProfile
  );

  return {
    analysis,
    rewrittenResume,
    downloadableResume: rewrittenResume,
    coverLetter: buildFallbackCoverLetter(
      jobDescription,
      toolkit.missingKeywords,
      candidateProfile
    ),
    validationSummary: validation.validationSummary,
    improvedMatchScore: validation.improvedMatchScore,
    agentReports: buildDefaultAgentReports(
      toolkit,
      validation.validationSummary
    ),
  };
}

async function runResumeMakerWorkflow(
  originalResumeText: string,
  rewrittenResume: string,
  candidateProfile: CandidateProfile,
  resumeBlueprint: ResumeBlueprint,
  traceGroupId: string
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return rewrittenResume;
  }

  const getResumeBlueprintTool = tool({
    name: "get_resume_blueprint",
    description:
      "Returns the original resume layout blueprint including section order, headings, bullet style, and sample body lines. Use it to keep the downloadable resume layout close to the original source resume.",
    parameters: z.object({}),
    strict: true,
    execute: async () => resumeBlueprint,
  });

  const downloadResumeSchema = z.object({
    downloadableResume: z.string(),
  });

  const prompt = `
You are the Resume Maker Agent.
Your only job is to convert the rewritten resume into the downloadable final resume while preserving the layout style of the original source resume as closely as possible.

Mandatory rules:
- First call \`get_resume_blueprint\`.
- After that, return JSON immediately.
- Treat the returned layout template as the structural scaffold for the downloadable resume.
- Preserve the original resume's section order when it is clear.
- Preserve the original heading hierarchy when it is clear.
- Preserve the original bullet markers and bullet density when it is clear.
- Keep spacing and section grouping as close to the source resume as possible in plain text.
- If the source resume uses bullets in a section, keep bullets in that section.
- If the source resume does not use bullets in a section, do not add them aggressively.
- Reuse the source resume's line pattern and section spacing whenever possible, replacing only the body text that needs tailoring.
- Keep the content ATS-safe and recruiter-presentable.
- Keep or strengthen a concise professional summary when the source resume supports one.
- Keep or strengthen a technical skills or core skills section when the source resume supports one with real technologies.
- Do not invent any information that is not supported by the original resume.
- Do not add markdown characters such as *, _, #, or backticks.
- Preserve the candidate's name, email, and phone.
- This output is for the downloadable PDF, so it should look like a polished final resume, not like UI copy.

Candidate profile:
${JSON.stringify(candidateProfile, null, 2)}

Original resume:
${originalResumeText}

Current rewritten resume:
${rewrittenResume}
`;

  try {
    const runner = new Runner({
      model: MODEL,
      modelSettings: {
        maxTokens: 1800,
        text: { verbosity: "medium" },
      },
      workflowName: "Resume Analyzer",
      groupId: traceGroupId,
      traceIncludeSensitiveData: true,
      traceMetadata: {
        app: "resume-analyzer",
        step: "Resume Maker Agent",
      },
    });

    const agent = new Agent({
      name: "Resume Maker Agent",
      instructions:
        "Call get_resume_blueprint exactly once. Use it to preserve the source resume's layout decisions in the downloadable resume. Then return only valid JSON matching the required output schema.",
      model: MODEL,
      outputType: downloadResumeSchema,
      tools: [getResumeBlueprintTool],
    });

    const result = await runner.run(agent, prompt, { maxTurns: 2 });
    const finalOutput = result.finalOutput;
    const downloadableResume =
      finalOutput && typeof finalOutput.downloadableResume === "string"
        ? finalOutput.downloadableResume
        : rewrittenResume;
    return sanitizeGeneratedDocument(
      enforceResumeQuality(
        rebuildResumeWithOriginalLayout(
          originalResumeText,
          downloadableResume,
          candidateProfile
        ),
        originalResumeText,
        "",
        candidateProfile,
        buildAnalysisToolkit(originalResumeText, rewrittenResume)
      )
    );
  } catch (error) {
    console.error("OpenAI resume maker workflow error:", error);
    return sanitizeGeneratedDocument(
      enforceResumeQuality(
        rebuildResumeWithOriginalLayout(
          originalResumeText,
          rewrittenResume,
          candidateProfile
        ),
        originalResumeText,
        "",
        candidateProfile,
        buildAnalysisToolkit(originalResumeText, rewrittenResume)
      )
    );
  } finally {
    await getGlobalTraceProvider().forceFlush();
  }
}

async function runCoverLetterPublisherWorkflow(
  draftCoverLetter: string,
  rewrittenResume: string,
  jobDescription: string,
  candidateProfile: CandidateProfile,
  traceGroupId: string
): Promise<string> {
  const fallbackCoverLetter = sanitizeGeneratedDocument(
    applyCandidateProfileToCoverLetter(draftCoverLetter, candidateProfile)
  );

  if (!OPENAI_API_KEY) {
    return fallbackCoverLetter;
  }

  const prompt = `
You are the Cover Letter Publisher Agent.
You specialize in turning a rough cover letter draft into a polished final letter that reads like it was prepared by a professional editor at a publishing house.

Your job:
- Improve grammar, punctuation, flow, sentence structure, and professionalism.
- Keep the letter presentable to recruiters and hiring managers.
- Keep the writing concise, confident, and natural.
- Preserve factual honesty. Do not add experience, credentials, metrics, or claims that are not supported by the resume or draft.
- Preserve the candidate's name and contact identity when available.
- Do not use markdown or decorative formatting characters such as \`*\`, \`_\`, \`#\`, or backticks.
- Return plain text only in valid JSON.

Candidate identity snapshot:
${JSON.stringify(candidateProfile, null, 2)}

Resume context:
${rewrittenResume}

Job description:
${jobDescription}

Current cover letter draft:
${draftCoverLetter}
`;

  try {
    const runner = new Runner({
      model: MODEL,
      modelSettings: {
        maxTokens: 900,
        text: { verbosity: "medium" },
      },
      workflowName: "Resume Analyzer",
      groupId: traceGroupId,
      traceIncludeSensitiveData: true,
      traceMetadata: {
        app: "resume-analyzer",
        step: "Cover Letter Publisher Agent",
      },
    });

    const agent = new Agent({
      name: "Cover Letter Publisher Agent",
      instructions:
        "Return only valid JSON matching the required output schema. Do not call tools.",
      model: MODEL,
      outputType: coverLetterPublisherSchema,
    });

    const result = await runner.run(agent, prompt, { maxTurns: 1 });
    const polishedCoverLetter =
      result.finalOutput &&
      typeof result.finalOutput.coverLetter === "string"
        ? result.finalOutput.coverLetter
        : draftCoverLetter;

    return sanitizeGeneratedDocument(
      applyCandidateProfileToCoverLetter(
        polishedCoverLetter,
        candidateProfile
      )
    );
  } catch (error) {
    console.error("OpenAI cover letter publisher workflow error:", error);
    return fallbackCoverLetter;
  } finally {
    await getGlobalTraceProvider().forceFlush();
  }
}

function buildDefaultAgentReports(
  toolkit: AnalysisToolkit,
  validationSummary: string
): AgentReport[] {
  return [
    {
      name: "Job Analysis Tool",
      summary: `Target role: ${toolkit.inferredRole}. Baseline score: ${toolkit.baselineScore}/100. Priority keywords: ${toolkit.extractedKeywords
        .slice(0, 6)
        .join(", ")}.`,
    },
    {
      name: "Resume Validation Tool",
      summary: validationSummary,
    },
    {
      name: "Recruiter Agent",
      summary:
        "Final recruiter pass focused on strengthening the resume honestly for ATS compatibility and recruiter readability.",
    },
    {
      name: "Cover Letter Publisher",
      summary:
        "Final cover letter pass focuses on grammar, punctuation, tone, and polish.",
    },
  ];
}

function appendOrReplaceAgentReport(
  reports: AgentReport[],
  report: AgentReport
) {
  const remaining = reports.filter((item) => item.name !== report.name);
  return [...remaining, report];
}

function buildFallbackResume(
  resumeText: string,
  jobDescription: string,
  candidateProfile: CandidateProfile,
  toolkit: AnalysisToolkit
) {
  const displayName = candidateProfile.originalName ?? "Candidate";
  const headerParts = [
    candidateProfile.originalEmail,
    candidateProfile.originalPhone,
  ].filter(Boolean);
  const sourceLines = extractResumeBodyLines(resumeText);
  const relevantSkills = extractRealSkillLines(resumeText, toolkit);
  const experienceLines = sourceLines.slice(0, 12);
  const educationLines = extractEducationLines(sourceLines);
  const summaryKeywords = toolkit.topKeywordMatches.slice(0, 5).join(", ");
  const polishedSummary = summaryKeywords
    ? `Results-oriented professional with experience spanning ${summaryKeywords}. Brings source-backed technical and delivery experience that can transfer well to adjacent roles.`
    : `Results-oriented professional with relevant technical experience and a track record of contributing to production work across engineering and delivery teams.`;

  return `${displayName}
${headerParts.join(" | ")}

SUMMARY
${polishedSummary}

${
  relevantSkills.length
    ? `CORE SKILLS\n${relevantSkills.join("\n")}\n\n`
    : ""
}PROFESSIONAL EXPERIENCE
${experienceLines.map((line) => `- ${line}`).join("\n")}
${
  educationLines.length
    ? `\n\nEDUCATION\n${educationLines.join("\n")}`
    : ""
}
`;
}

function enforceResumeQuality(
  resumeText: string,
  originalResumeText: string,
  jobDescription: string,
  candidateProfile: CandidateProfile,
  toolkit: AnalysisToolkit
) {
  let nextResume = sanitizeGeneratedDocument(
    applyCandidateProfileToResume(resumeText, candidateProfile)
  );

  const sectionMap = parseResumeSectionsMap(nextResume);
  const hasSummary = sectionMap.has("SUMMARY");
  const hasSkills =
    sectionMap.has("CORE SKILLS") || sectionMap.has("SKILLS");
  const experienceSection =
    sectionMap.get("PROFESSIONAL EXPERIENCE") ?? sectionMap.get("EXPERIENCE");
  const experienceLineCount = experienceSection?.length ?? 0;

  if (!hasSummary) {
    nextResume = insertSectionAfterHeader(
      nextResume,
      "SUMMARY",
      [buildProfessionalSummary(originalResumeText, toolkit)]
    );
  }

  if (!hasSkills) {
    const skillLines = extractRealSkillLines(originalResumeText, toolkit).slice(0, 8);
    if (skillLines.length > 0) {
      nextResume = insertSectionAfterSection(
        nextResume,
        "SUMMARY",
        "CORE SKILLS",
        skillLines
      );
    }
  }

  if (experienceLineCount < 4) {
    return buildFallbackResume(
      originalResumeText,
      jobDescription || nextResume,
      candidateProfile,
      toolkit
    );
  }

  if (nextResume.length < 700) {
    const fallbackResume = buildFallbackResume(
      originalResumeText,
      jobDescription || nextResume,
      candidateProfile,
      toolkit
    );
    if (fallbackResume.length > nextResume.length) {
      return fallbackResume;
    }
  }

  return nextResume;
}

function buildProfessionalSummary(
  originalResumeText: string,
  toolkit: AnalysisToolkit
) {
  const sourceLines = extractResumeBodyLines(originalResumeText).slice(0, 6);
  const keywordText = toolkit.topKeywordMatches.slice(0, 4).join(", ");

  if (sourceLines.length > 0 && keywordText) {
    const sourceSummary = sourceLines
      .slice(0, 2)
      .map(stripBulletPrefix)
      .join(" and ");
    return (
      "Results-oriented professional with experience across " +
      keywordText +
      ". Brings source-backed work spanning " +
      sourceSummary +
      "."
    );
  }

  if (keywordText) {
    return (
      "Results-oriented professional with source-backed experience across " +
      keywordText +
      ", with a focus on clear execution, collaboration, and delivery."
    );
  }

  return (
    "Results-oriented professional with source-backed technical and delivery " +
    "experience, strong communication skills, and a record of contributing " +
    "to real project work."
  );
}

function buildFallbackCoverLetter(
  jobDescription: string,
  missingKeywords: string[],
  candidateProfile: CandidateProfile
): string {
  const role = inferRoleFromJobDescription(jobDescription);
  const signatureName = candidateProfile.originalName ?? "Candidate";
  const emphasis =
    missingKeywords.slice(0, 4).join(", ") ||
    "the core priorities listed in the job description";

  return `Dear Hiring Manager,

I am applying for the ${role} with a background that includes relevant experience from my current resume. I am particularly interested in opportunities where I can contribute using the skills and experience I already have while continuing to grow.

My background aligns with portions of this role, especially around ${emphasis}. I would welcome the opportunity to discuss where my experience is strongest and how I could contribute honestly and effectively.

Thank you for your time and consideration.

Sincerely,
${signatureName}`;
}

function buildAnalysisToolkit(
  resumeText: string,
  jobDescription: string
): AnalysisToolkit {
  const { score, matchedKeywords, missingKeywords } = calculateScoreAndGaps(
    resumeText,
    jobDescription
  );

  return {
    inferredRole: inferRoleFromJobDescription(jobDescription),
    extractedKeywords: extractKeywords(jobDescription).slice(0, 15),
    matchedKeywords,
    missingKeywords,
    baselineScore: score,
    topKeywordMatches: matchedKeywords.slice(0, 8),
  };
}

function buildMockValidation(
  rewrittenResume: string,
  jobDescription: string,
  candidateProfile: CandidateProfile
): ValidationResult {
  const containsNonAscii = /[^\x09\x0A\x0D\x20-\x7E]/.test(rewrittenResume);
  const hasPlaceholder = /NAME HERE|YOUR NAME|your.email@example.com/i.test(
    rewrittenResume
  );
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(
    rewrittenResume
  );
  const hasPhone = /(\+?\d[\d\s().-]{7,})/.test(rewrittenResume);
  const issues: string[] = [];

  if (containsNonAscii) {
    issues.push("Remove decorative or non-ASCII characters for ATS parsing.");
  }
  if (hasPlaceholder) {
    issues.push("Replace placeholder identity details with the candidate's details.");
  }
  if ((candidateProfile.originalEmail && !hasEmail) || (candidateProfile.originalPhone && !hasPhone)) {
    issues.push("Keep the candidate's original contact details in the header.");
  }
  if (
    candidateProfile.originalName &&
    !rewrittenResume
      .toLowerCase()
      .includes(candidateProfile.originalName.toLowerCase())
  ) {
    issues.push("Keep the candidate's original name in the rewritten resume.");
  }
  if (containsResumeAdvice(rewrittenResume)) {
    issues.push(
      "Remove coaching notes, suggestions, placeholders, and unsupported filler from the downloadable resume."
    );
  }
  if (containsDisallowedFormattingCharacters(rewrittenResume)) {
    issues.push(
      "Remove markdown-style or decorative characters such as asterisks, underscores, backticks, and hash headings."
    );
  }

  const { score } = calculateScoreAndGaps(rewrittenResume, jobDescription);
  const summary = issues.length
    ? `Needs attention: ${issues.join(" ")}`
    : "Resume formatting, identity details, and ATS structure look acceptable.";

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

function extractKeywords(jobDescription: string) {
  return Array.from(
    new Set(
      jobDescription
        .toLowerCase()
        .match(/\b[a-z][a-z0-9+/.-]{3,}\b/g)
        ?.filter(
          (word) =>
            ![
              "with",
              "have",
              "this",
              "that",
              "from",
              "will",
              "your",
              "their",
              "about",
            ].includes(word)
        ) ?? []
    )
  );
}

function sanitizeMultilineInput(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
}

function extractCandidateProfile(resumeText: string): CandidateProfile {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? null;
  const originalName =
    firstLine &&
    !/@/.test(firstLine) &&
    !/\d/.test(firstLine) &&
    firstLine.length <= 60
      ? firstLine
      : null;
  const originalEmail =
    resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const originalPhone =
    resumeText.match(/(\+?\d[\d\s().-]{7,})/)?.[0] ?? null;

  return {
    originalName,
    originalEmail,
    originalPhone,
  };
}

function buildCandidateProfile(
  resumeText: string,
  accountEmail: string,
  firstName: string | null,
  lastName: string | null
): CandidateProfile {
  const extracted = extractCandidateProfile(resumeText);
  const accountName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    originalName: (extracted.originalName ?? accountName) || null,
    originalEmail: extracted.originalEmail ?? accountEmail ?? null,
    originalPhone: extracted.originalPhone,
  };
}

function buildResumeBlueprint(
  resumeText: string,
  candidateProfile: CandidateProfile
): ResumeBlueprint {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headingLines = lines.filter(isLikelyHeading).slice(0, 8);
  const sectionOrder = headingLines.map(normalizeHeadingLabel);
  const dashBullets = lines.filter((line) => /^-\s+/.test(line)).length;
  const dotBullets = lines.filter((line) => /^•\s+/.test(line)).length;
  const bulletStyle =
    dashBullets > 0 && dotBullets === 0
      ? "dash"
      : dotBullets > 0 && dashBullets === 0
        ? "bullet"
        : dashBullets > 0 || dotBullets > 0
          ? "mixed"
          : "none";

  return {
    candidateProfile,
    sectionOrder,
    headingLines,
    bulletStyle,
    sampleBodyLines: extractResumeBodyLines(resumeText).slice(0, 12),
    layoutTemplate: buildLayoutTemplate(resumeText, candidateProfile),
  };
}

function buildLayoutTemplate(
  resumeText: string,
  candidateProfile: CandidateProfile
) {
  let template = resumeText;

  if (candidateProfile.originalName) {
    template = template.replaceAll(
      candidateProfile.originalName,
      "[CANDIDATE_NAME]"
    );
  }

  if (candidateProfile.originalEmail) {
    template = template.replaceAll(
      candidateProfile.originalEmail,
      "[CANDIDATE_EMAIL]"
    );
  }

  if (candidateProfile.originalPhone) {
    template = template.replaceAll(
      candidateProfile.originalPhone,
      "[CANDIDATE_PHONE]"
    );
  }

  return template;
}

type ParsedResumeSection = {
  heading: string;
  lines: string[];
};

type ParsedResumeStructure = {
  headerLines: string[];
  sections: ParsedResumeSection[];
};

function rebuildResumeWithOriginalLayout(
  originalResumeText: string,
  generatedResumeText: string,
  candidateProfile: CandidateProfile
) {
  const originalStructure = parseResumeStructure(originalResumeText);
  const generatedStructure = parseResumeStructure(generatedResumeText);
  const generatedWithIdentity = applyCandidateProfileToResume(
    generatedResumeText,
    candidateProfile
  );

  if (originalStructure.sections.length === 0) {
    return generatedWithIdentity;
  }

  const generatedSections = new Map(
    generatedStructure.sections.map((section) => [
      normalizeHeadingLabel(section.heading),
      section,
    ])
  );
  const usedSectionKeys = new Set<string>();

  const rebuiltSections = originalStructure.sections.map((originalSection) => {
    const normalizedHeading = normalizeHeadingLabel(originalSection.heading);
    const generatedSection = generatedSections.get(normalizedHeading);
    if (generatedSection) {
      usedSectionKeys.add(normalizedHeading);
    }
    const originalBulletMarker = detectSectionBulletMarker(originalSection.lines);
    const sectionLines = generatedSection?.lines.length
      ? applySectionBulletMarker(generatedSection.lines, originalBulletMarker)
      : originalSection.lines;

    return [originalSection.heading, ...sectionLines].join("\n").trim();
  });

  const additionalGeneratedSections = generatedStructure.sections
    .filter(
      (section) => !usedSectionKeys.has(normalizeHeadingLabel(section.heading))
    )
    .map((section) => [section.heading, ...section.lines].join("\n").trim());

  const headerLines = buildResumeHeaderLines(
    originalStructure.headerLines,
    candidateProfile
  );

  const rebuiltResume = [...headerLines, ...rebuiltSections, ...additionalGeneratedSections]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (
    !rebuiltResume ||
    rebuiltResume.length < Math.max(300, Math.floor(generatedWithIdentity.length * 0.6))
  ) {
    return generatedWithIdentity;
  }

  return rebuiltResume;
}

function parseResumeStructure(resumeText: string): ParsedResumeStructure {
  const lines = resumeText.replace(/\r\n/g, "\n").split("\n");
  const headerLines: string[] = [];
  const sections: ParsedResumeSection[] = [];
  let currentSection: ParsedResumeSection | null = null;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    if (!currentSection && !trimmedLine) {
      if (headerLines.length > 0 && headerLines[headerLines.length - 1] !== "") {
        headerLines.push("");
      }
      continue;
    }

    if (trimmedLine && isLikelyHeading(trimmedLine)) {
      if (currentSection) {
        sections.push({
          heading: currentSection.heading,
          lines: trimSectionSpacing(currentSection.lines),
        });
      }
      currentSection = {
        heading: trimmedLine,
        lines: [],
      };
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(rawLine.replace(/\s+$/g, ""));
    } else {
      headerLines.push(rawLine.replace(/\s+$/g, ""));
    }
  }

  if (currentSection) {
    sections.push({
      heading: currentSection.heading,
      lines: trimSectionSpacing(currentSection.lines),
    });
  }

  return {
    headerLines: trimSectionSpacing(headerLines),
    sections,
  };
}

function parseResumeSectionsMap(resumeText: string) {
  const structure = parseResumeStructure(resumeText);
  return new Map(
    structure.sections.map((section) => [
      normalizeHeadingLabel(section.heading),
      section.lines,
    ])
  );
}

function insertSectionAfterHeader(
  resumeText: string,
  heading: string,
  lines: string[]
) {
  const structure = parseResumeStructure(resumeText);
  const sectionText = [heading, ...lines].join("\n").trim();
  const renderedSections = structure.sections.map((section) =>
    [section.heading, ...section.lines].join("\n").trim()
  );
  return [...structure.headerLines, sectionText, ...renderedSections]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function insertSectionAfterSection(
  resumeText: string,
  afterHeading: string,
  newHeading: string,
  newLines: string[]
) {
  const structure = parseResumeStructure(resumeText);
  const headerText = structure.headerLines.join("\n").trim();
  const normalizedAfter = normalizeHeadingLabel(afterHeading);
  const newSectionText = [newHeading, ...newLines].join("\n").trim();
  const renderedSections: string[] = [];
  let inserted = false;

  for (const section of structure.sections) {
    renderedSections.push([section.heading, ...section.lines].join("\n").trim());
    if (!inserted && normalizeHeadingLabel(section.heading) === normalizedAfter) {
      renderedSections.push(newSectionText);
      inserted = true;
    }
  }

  if (!inserted) {
    renderedSections.unshift(newSectionText);
  }

  return [headerText, ...renderedSections].filter(Boolean).join("\n\n").trim();
}

function trimSectionSpacing(lines: string[]) {
  const trimmed = [...lines];

  while (trimmed.length > 0 && !trimmed[0]?.trim()) {
    trimmed.shift();
  }

  while (trimmed.length > 0 && !trimmed[trimmed.length - 1]?.trim()) {
    trimmed.pop();
  }

  return trimmed;
}

function buildResumeHeaderLines(
  originalHeaderLines: string[],
  candidateProfile: CandidateProfile
) {
  const headerLines: string[] = [];

  if (candidateProfile.originalName) {
    headerLines.push(candidateProfile.originalName);
  } else if (originalHeaderLines[0]?.trim()) {
    headerLines.push(originalHeaderLines[0].trim());
  }

  const contactParts = [
    candidateProfile.originalEmail,
    candidateProfile.originalPhone,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    headerLines.push(contactParts.join(" | "));
  } else {
    const originalContactLine = originalHeaderLines.find((line) => /@|\d/.test(line));
    if (originalContactLine?.trim()) {
      headerLines.push(originalContactLine.trim());
    }
  }

  return headerLines;
}

function detectSectionBulletMarker(lines: string[]) {
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^•\s+/.test(trimmed)) {
      return "•";
    }
    if (/^-\s+/.test(trimmed)) {
      return "-";
    }
  }

  return null;
}

function applySectionBulletMarker(lines: string[], bulletMarker: string | null) {
  if (!bulletMarker) {
    return lines;
  }

  return lines.map((line) => {
    const leadingWhitespace = line.match(/^\s*/)?.[0] ?? "";
    const trimmed = line.trim();
    if (/^[•-]\s+/.test(trimmed)) {
      return `${leadingWhitespace}${bulletMarker} ${trimmed.replace(
        /^[•-]\s+/,
        ""
      )}`;
    }
    return line;
  });
}

function stripBulletPrefix(line: string) {
  return line.trim().replace(/^[•-]\s+/, "");
}

function extractResumeBodyLines(resumeText: string) {
  return resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/@/.test(line) &&
        !/^\+?\d[\d\s().-]{7,}$/.test(line) &&
        line.length > 2
    )
    .slice(1);
}

function isLikelyHeading(line: string) {
  if (!line || line.length > 40) {
    return false;
  }

  if (/@|\d{3,}/.test(line)) {
    return false;
  }

  return (
    /^[A-Z][A-Z\s&/]+$/.test(line) ||
    /^(summary|experience|professional experience|skills|core skills|projects|education|certifications|additional details)$/i.test(
      line
    )
  );
}

function normalizeHeadingLabel(line: string) {
  return line.replace(/\s+/g, " ").trim().toUpperCase();
}

function extractRealSkillLines(
  resumeText: string,
  toolkit: AnalysisToolkit
) {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const skillLikeLines = lines.filter(
    (line) =>
      /[:,]/.test(line) &&
      !/@/.test(line) &&
      line.length < 120 &&
      /(skill|tools|technolog|stack|language|framework|platform)/i.test(line)
  );

  if (skillLikeLines.length > 0) {
    return skillLikeLines.slice(0, 6);
  }

  return toolkit.topKeywordMatches.slice(0, 8).map((keyword) => `- ${keyword}`);
}

function extractEducationLines(lines: string[]) {
  return lines.filter((line) =>
    /(university|college|bachelor|master|degree|b\.a\.|b\.s\.|m\.s\.)/i.test(
      line
    )
  ).slice(0, 3);
}

function isWeakResumeDraft(rewrittenResume: string) {
  const normalized = rewrittenResume.toLowerCase();
  return (
    normalized.length < 500 ||
    normalized.includes("candidate with experience relevant") ||
    normalized.includes("professional with experience relevant") ||
    !/(professional experience|experience)/i.test(rewrittenResume)
  );
}

function applyCandidateProfileToResume(
  rewrittenResume: string,
  candidateProfile: CandidateProfile
) {
  const lines = rewrittenResume
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/g, ""));
  const bodyStartIndex = lines.findIndex((line) =>
    /^(summary|core skills|professional experience|experience|education)\b/i.test(
      line.trim()
    )
  );
  const bodyLines =
    bodyStartIndex >= 0 ? lines.slice(bodyStartIndex) : lines.filter(Boolean);
  const headerLines: string[] = [];

  if (candidateProfile.originalName) {
    headerLines.push(candidateProfile.originalName);
  }

  const contactParts = [
    candidateProfile.originalEmail,
    candidateProfile.originalPhone,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    headerLines.push(contactParts.join(" | "));
  }

  if (headerLines.length === 0) {
    return rewrittenResume;
  }

  return [...headerLines, "", ...bodyLines].join("\n").trim();
}

function applyCandidateProfileToCoverLetter(
  coverLetter: string,
  candidateProfile: CandidateProfile
) {
  if (!candidateProfile.originalName) {
    return coverLetter;
  }

  const trimmed = coverLetter.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/sincerely,\s*$/i.test(trimmed)) {
    return `${trimmed}\n${candidateProfile.originalName}`;
  }

  if (!trimmed.includes(candidateProfile.originalName)) {
    return `${trimmed}\n\nSincerely,\n${candidateProfile.originalName}`;
  }

  return trimmed;
}

function containsResumeAdvice(rewrittenResume: string) {
  const normalized = rewrittenResume.toLowerCase();
  const blockedPhrases = [
    "tailor this",
    "tailor to",
    "add ",
    "include ",
    "highlight ",
    "mention ",
    "replace ",
    "optional",
    "format notes",
    "relevant coursework",
    "yourprofile",
    "your name",
    "your.email@example.com",
  ];

  if (blockedPhrases.some((phrase) => normalized.includes(phrase))) {
    return true;
  }

  return normalized
    .split(/\n+/)
    .some((line) =>
      /^[-*]\s*(add|include|highlight|mention|replace|tailor|use|keep)\b/.test(
        line.trim()
      )
    );
}

function containsDisallowedFormattingCharacters(text: string) {
  return (
    /(^|\s)[*#`]+(\s|$)/m.test(text) ||
    /(^|\s)_[^@\n]+_(\s|$)/m.test(text) ||
    /\*\*[^\n]+\*\*/.test(text) ||
    /`[^`\n]+`/.test(text)
  );
}

function sanitizeGeneratedDocument(text: string) {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/(^|\s)_([^@\n][^_\n]*?)_(?=\s|$)/gm, "$1$2")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^[#*]+\s*/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
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
