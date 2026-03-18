// lib/pdfParser.ts
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist/webpack'

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`

type PositionedTextItem = {
  str: string
  x: number
  y: number
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const items: PositionedTextItem[] = content.items
      .map((item) => {
        if (!('str' in item) || !item.str.trim()) {
          return null
        }

        const transform = Array.isArray(item.transform) ? item.transform : null
        if (!transform || transform.length < 6) {
          return null
        }

        return {
          str: item.str.trim(),
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
        }
      })
      .filter((item): item is PositionedTextItem => Boolean(item))

    const lines = groupTextItemsIntoLines(items)
    pages.push(lines.join('\n').trim())
  }

  return pages.filter(Boolean).join('\n\n').trim()
}

function groupTextItemsIntoLines(items: PositionedTextItem[]) {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 2) {
      return b.y - a.y
    }
    return a.x - b.x
  })

  const lines: Array<{ y: number; items: PositionedTextItem[] }> = []

  for (const item of sorted) {
    const existingLine = lines.find((line) => Math.abs(line.y - item.y) <= 2)
    if (existingLine) {
      existingLine.items.push(item)
      continue
    }

    lines.push({ y: item.y, items: [item] })
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) =>
      line.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
}
