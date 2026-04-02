// lib/resumeDownload.ts
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

const DEFAULT_RESUME_FILE_NAME = "Updated-Resume";
const DEFAULT_COVER_LETTER_FILE_NAME = "Cover-Letter";
const PAGE_MARGIN = 50;
const BODY_FONT_SIZE = 10.5;
const BODY_LINE_HEIGHT = 15;
const SECTION_HEADING_SIZE = 11;
const SECTION_GAP = 12;
const INDENT_SIZE = 14;

type ResumeSection = {
  heading: string;
  lines: string[];
};

type ResumeDocument = {
  headerLines: string[];
  sections: ResumeSection[];
};

function toAsciiSafe(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

export function buildResumeFileName(fullName?: string | null) {
  const base = buildBaseFileName(fullName);
  return `${base || DEFAULT_RESUME_FILE_NAME}.pdf`;
}

export function buildCoverLetterFileName(fullName?: string | null) {
  const base = buildBaseFileName(fullName);
  const suffix = base ? `${base}-Cover-Letter` : DEFAULT_COVER_LETTER_FILE_NAME;
  return `${suffix}.pdf`;
}

function buildBaseFileName(fullName?: string | null) {
  if (!fullName) return "";
  const sanitized = toAsciiSafe(fullName);
  if (!sanitized) return "";
  const parts = sanitized.split(/\s+/).filter(Boolean);
  return parts.join("-");
}

function wrapLine(
  line: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
) {
  const trailingTrimmed = line.replace(/\s+$/g, "");
  if (!trailingTrimmed.trim()) {
    return [""];
  }

  const leadingWhitespace = trailingTrimmed.match(/^\s*/)?.[0] ?? "";
  const normalized = trailingTrimmed.trim();
  const bulletPrefixMatch = normalized.match(/^([•-])\s+/);
  const bulletPrefix = bulletPrefixMatch ? `${bulletPrefixMatch[1]} ` : "";
  const contentStart = bulletPrefix.length;
  const content = contentStart > 0 ? normalized.slice(contentStart).trim() : normalized;

  let tokens = content.split(/\s+/).filter(Boolean);
  if (bulletPrefix && !tokens.length) {
    tokens = [bulletPrefix.trim()];
  } else if (bulletPrefix && tokens.length) {
    tokens = [`${bulletPrefix}${tokens[0]}`, ...tokens.slice(1)];
  }

  const lines: string[] = [];
  let currentLine = "";

  const appendWord = (base: string, word: string) =>
    base ? `${base}${base.endsWith(" ") ? "" : " "}${word}` : word;

  const breakWord = (word: string) => {
    const segments: string[] = [];
    let remaining = word;
    while (remaining.length) {
      let sliceLength = remaining.length;
      while (
        sliceLength > 0 &&
        font.widthOfTextAtSize(remaining.slice(0, sliceLength), fontSize) >
          maxWidth
      ) {
        sliceLength--;
      }
      if (sliceLength === 0) {
        break;
      }
      segments.push(remaining.slice(0, sliceLength));
      remaining = remaining.slice(sliceLength);
    }
    return segments;
  };

  const applyIndentation = (value: string) =>
    value ? `${leadingWhitespace}${value}` : leadingWhitespace;

  for (const token of tokens) {
    const candidate = appendWord(currentLine, token);
    if (
      font.widthOfTextAtSize(applyIndentation(candidate), fontSize) <= maxWidth
    ) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(applyIndentation(currentLine));
      currentLine = "";
    }

    if (font.widthOfTextAtSize(applyIndentation(token), fontSize) <= maxWidth) {
      currentLine = token;
      continue;
    }

    const broken = breakWord(token);
    if (!broken.length) continue;
    lines.push(...broken.slice(0, -1).map(applyIndentation));
    currentLine = broken[broken.length - 1];
  }

  if (currentLine) {
    lines.push(applyIndentation(currentLine));
  }

  return lines.length ? lines : [""];
}

function isResumeHeading(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 40) {
    return false;
  }

  return /^(summary|core skills|skills|professional experience|experience|projects|education|certifications|additional details|additional information)$/i.test(
    trimmed
  );
}

function parseResumeDocument(content: string): ResumeDocument {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const headerLines: string[] = [];
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;
  let seenSection = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentSection && currentSection.lines[currentSection.lines.length - 1] !== "") {
        currentSection.lines.push("");
      }
      continue;
    }

    if (isResumeHeading(trimmed)) {
      seenSection = true;
      currentSection = {
        heading: trimmed.toUpperCase(),
        lines: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (!seenSection) {
      headerLines.push(trimmed);
      continue;
    }

    if (!currentSection) {
      currentSection = {
        heading: "EXPERIENCE",
        lines: [],
      };
      sections.push(currentSection);
    }

    currentSection.lines.push(line);
  }

  return {
    headerLines,
    sections: sections.map((section) => ({
      ...section,
      lines: trimEmptySectionLines(section.lines),
    })),
  };
}

function trimEmptySectionLines(lines: string[]) {
  const nextLines = [...lines];

  while (nextLines[0] === "") {
    nextLines.shift();
  }

  while (nextLines[nextLines.length - 1] === "") {
    nextLines.pop();
  }

  return nextLines;
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    font: PDFFont;
    fontSize: number;
    lineHeight: number;
    color?: ReturnType<typeof rgb>;
  }
) {
  const {
    x,
    y,
    maxWidth,
    font,
    fontSize,
    lineHeight,
    color = rgb(0.1, 0.1, 0.1),
  } = options;
  const wrappedLines = wrapLine(text, font, fontSize, maxWidth);
  let cursorY = y;

  for (const line of wrappedLines) {
    if (line) {
      page.drawText(line, {
        x,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });
    }
    cursorY -= lineHeight;
  }

  return cursorY;
}

export async function downloadResumeAsPdf(
  content: string,
  fullName?: string | null
) {
  await downloadDocumentAsPdf(content, buildResumeFileName(fullName));
}

export async function downloadCoverLetterAsPdf(
  content: string,
  fullName?: string | null
) {
  await downloadDocumentAsPdf(content, buildCoverLetterFileName(fullName));
}

async function downloadDocumentAsPdf(content: string, fileName: string) {
  if (typeof window === "undefined") {
    throw new Error("PDF generation is only available in the browser.");
  }

  if (!content.trim()) {
    throw new Error("Document content is empty.");
  }

  const pdfDoc = await PDFDocument.create();
  const nameFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const headingFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageSize: [number, number] = [612, 792];
  const resume = parseResumeDocument(content);

  let page = pdfDoc.addPage(pageSize);
  let { width, height } = page.getSize();
  const maxWidth = width - PAGE_MARGIN * 2;
  let cursorY = height - PAGE_MARGIN;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight >= PAGE_MARGIN) {
      return;
    }
    page = pdfDoc.addPage(pageSize);
    ({ width, height } = page.getSize());
    cursorY = height - PAGE_MARGIN;
  };

  const [nameLine, ...headerMetaLines] = resume.headerLines;
  if (nameLine) {
    const nameSize = 20;
    const nameWidth = nameFont.widthOfTextAtSize(nameLine, nameSize);
    page.drawText(nameLine, {
      x: (width - nameWidth) / 2,
      y: cursorY,
      size: nameSize,
      font: nameFont,
      color: rgb(0.08, 0.08, 0.08),
    });
    cursorY -= 24;
  }

  for (const line of headerMetaLines.slice(0, 2)) {
    const fontSize = 9.5;
    const lineWidth = bodyFont.widthOfTextAtSize(line, fontSize);
    page.drawText(line, {
      x: (width - lineWidth) / 2,
      y: cursorY,
      size: fontSize,
      font: bodyFont,
      color: rgb(0.35, 0.35, 0.35),
    });
    cursorY -= 14;
  }

  if (resume.headerLines.length > 0) {
    cursorY -= 6;
    page.drawLine({
      start: { x: PAGE_MARGIN, y: cursorY },
      end: { x: width - PAGE_MARGIN, y: cursorY },
      thickness: 1,
      color: rgb(0.82, 0.84, 0.88),
    });
    cursorY -= 22;
  }

  for (const section of resume.sections) {
    ensureSpace(32);
    page.drawText(section.heading, {
      x: PAGE_MARGIN,
      y: cursorY,
      size: SECTION_HEADING_SIZE,
      font: headingFont,
      color: rgb(0.18, 0.26, 0.4),
    });
    page.drawLine({
      start: { x: PAGE_MARGIN, y: cursorY - 3 },
      end: { x: width - PAGE_MARGIN, y: cursorY - 3 },
      thickness: 0.75,
      color: rgb(0.85, 0.87, 0.9),
    });
    cursorY -= 18;

    for (const line of section.lines) {
      if (!line.trim()) {
        cursorY -= 6;
        continue;
      }

      const bulletMatch = line.trim().match(/^[•-]\s+(.*)$/);
      const text = bulletMatch ? bulletMatch[1] : line.trim();
      const textX = bulletMatch ? PAGE_MARGIN + INDENT_SIZE : PAGE_MARGIN;
      const textWidth = bulletMatch ? maxWidth - INDENT_SIZE : maxWidth;
      const wrappedLines = wrapLine(
        text,
        bodyFont,
        BODY_FONT_SIZE,
        textWidth
      );
      const requiredHeight = wrappedLines.length * BODY_LINE_HEIGHT + 2;
      ensureSpace(requiredHeight);

      if (bulletMatch) {
        page.drawText("-", {
          x: PAGE_MARGIN + 2,
          y: cursorY,
          size: BODY_FONT_SIZE,
          font: headingFont,
          color: rgb(0.16, 0.16, 0.16),
        });
      }

      cursorY = drawWrappedText(page, text, {
        x: textX,
        y: cursorY,
        maxWidth: textWidth,
        font: bodyFont,
        fontSize: BODY_FONT_SIZE,
        lineHeight: BODY_LINE_HEIGHT,
      });
    }

    cursorY -= SECTION_GAP;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
