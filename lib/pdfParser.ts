// lib/pdfParser.ts
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist/webpack'

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  let finalText = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const strings = content.items.map((item: { str: string }) => item.str)
    finalText += strings.join(' ') + '\n'
  }

  return finalText
}
