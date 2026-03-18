// lib/resumeDownload.ts
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";

const DEFAULT_RESUME_FILE_NAME = "Updated-Resume";
const DEFAULT_COVER_LETTER_FILE_NAME = "Cover-Letter";
const PAGE_MARGIN = 48;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;

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
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();
  const maxWidth = width - PAGE_MARGIN * 2;
  let cursorY = height - PAGE_MARGIN;

  const normalizedLines = content.replace(/\r\n/g, "\n").split("\n");

  for (const rawLine of normalizedLines) {
    const wrappedLines = wrapLine(rawLine, font, FONT_SIZE, maxWidth);
    for (const line of wrappedLines) {
      if (cursorY < PAGE_MARGIN) {
        page = pdfDoc.addPage();
        ({ width, height } = page.getSize());
        cursorY = height - PAGE_MARGIN;
      }

      if (line) {
        page.drawText(line, {
          x: PAGE_MARGIN,
          y: cursorY,
          size: FONT_SIZE,
          font,
        });
      }
      cursorY -= LINE_HEIGHT;
    }
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
