export interface OCRResult {
  id: string
  text: string
  bbox: [number, number, number, number]  // x, y, w, h
  confidence: number
  corrected?: string
}

export interface Document {
  id: string
  name: string
  imageUrl: string
  results: OCRResult[]
  annotations: Annotation[]
  createdAt: string
}

export interface Annotation {
  id: string
  type: 'region' | 'character' | 'note'
  bbox: [number, number, number, number]
  label: string
  content: string
}

export interface VariantChar {
  ancient: string
  modern: string
  frequency: number
}

export interface SearchHit {
  result: OCRResult
  docId: string
  docName: string
  lineIndex: number
  charStart: number
  charEnd: number
  bbox: [number, number, number, number]
  matchedSource: 'original' | 'corrected'
  matchedText: string
  totalLines: number
  contextBefore: string
  contextAfter: string
}

export interface SearchGroup {
  docId: string
  docName: string
  hits: SearchHit[]
  hitCount: number
}
