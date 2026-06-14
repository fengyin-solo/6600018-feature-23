<template>
  <div class="flex h-screen">
    <!-- Left: Document list -->
    <div class="w-72 bg-gray-900 p-4 flex flex-col gap-3 border-r border-gray-800">
      <h1 class="text-lg font-bold text-amber-400">古籍 OCR 标注平台</h1>

      <div>
        <label class="block bg-amber-500 text-black text-center py-2 rounded cursor-pointer hover:bg-amber-400 text-sm font-medium">
          上传古籍图片
          <input type="file" accept="image/*" @change="onUpload" class="hidden" />
        </label>
      </div>

      <button @click="store.loadMockDocument()" class="bg-gray-800 py-2 rounded text-sm hover:bg-gray-700">
        加载示例文档
      </button>

      <!-- Search -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <input v-model="store.searchQuery" @input="store.searchInDocuments(store.searchQuery)"
            placeholder="全文检索..." class="flex-1 bg-gray-800 rounded px-3 py-2 text-sm" />
          <span v-if="totalHits > 0" class="text-xs text-amber-400 shrink-0">{{ totalHits }} 命中</span>
        </div>
        <div v-if="store.searchGroups.length" class="space-y-2 max-h-80 overflow-y-auto pr-1"
          style="scrollbar-width: thin;">
          <div v-for="group in store.searchGroups" :key="group.docId" class="bg-gray-800 rounded overflow-hidden">
            <div class="px-2.5 py-1.5 bg-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-600 transition-colors"
              @click="store.currentDoc = store.documents.find(d => d.id === group.docId) || null">
              <span class="text-xs font-semibold text-amber-300 truncate flex items-center gap-1">
                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                {{ group.docName }}
              </span>
              <span class="text-[10px] text-gray-300 bg-amber-700/60 px-1.5 py-0.5 rounded font-medium">{{ group.hitCount }}</span>
            </div>
            <div class="divide-y divide-gray-700/50">
              <div v-for="(hit, hIdx) in group.hits" :key="hit.result.id + '-' + hIdx"
                @click="jumpAndScroll(hit)"
                class="px-2 py-2 cursor-pointer hover:bg-gray-700/60 transition-colors"
                :class="store.highlightedResultId === hit.result.id ? 'bg-amber-900/30 ring-1 ring-amber-500/50' : ''">
                <div class="flex items-start justify-between gap-1 mb-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[10px] font-mono text-gray-400 bg-gray-700/70 px-1.5 py-0.5 rounded shrink-0">
                      L{{ hit.lineIndex }}/{{ hit.totalLines }}
                    </span>
                    <span class="text-[10px] font-mono text-gray-400 bg-gray-700/70 px-1.5 py-0.5 rounded shrink-0">
                      C{{ hit.charStart }}-{{ hit.charEnd }}
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                      :class="hit.matchedSource === 'corrected' ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'">
                      {{ hit.matchedSource === 'corrected' ? '校正' : '原文' }}
                    </span>
                  </div>
                  <span class="text-[10px] text-gray-500 shrink-0 mt-0.5">
                    {{ (hit.result.confidence * 100).toFixed(0) }}%
                  </span>
                </div>
                <div class="text-xs text-gray-300 space-y-0.5">
                  <div v-if="hit.contextBefore" class="text-gray-500 text-[10px] truncate">
                    ↑ {{ hit.contextBefore }}
                  </div>
                  <div class="truncate" v-html="highlightText(hit.matchedSource === 'corrected' && hit.result.corrected ? hit.result.corrected : hit.result.text, store.searchQuery)"></div>
                  <div v-if="hit.contextAfter" class="text-gray-500 text-[10px] truncate">
                    ↓ {{ hit.contextAfter }}
                  </div>
                </div>
                <div class="mt-1 text-[9px] font-mono text-gray-500 flex items-center gap-1">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  ({{ hit.bbox[0] }}, {{ hit.bbox[1] }}) {{ hit.bbox[2] }}×{{ hit.bbox[3] }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="store.searchQuery.trim()" class="text-xs text-gray-500 text-center py-3 bg-gray-800/50 rounded">
          <svg class="w-8 h-8 mx-auto mb-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          未找到匹配结果
        </div>
      </div>

      <!-- Document list -->
      <div class="flex-1 overflow-y-auto space-y-1">
        <div v-for="d in store.documents" :key="d.id" @click="store.currentDoc = d"
          class="bg-gray-800 rounded p-2 cursor-pointer text-sm"
          :class="store.currentDoc?.id === d.id ? 'ring-1 ring-amber-500' : ''">
          {{ d.name }}
          <div class="text-xs text-gray-500">{{ d.results.length }} 行识别</div>
        </div>
      </div>

      <!-- Export -->
      <button @click="doExport" class="bg-green-700 py-2 rounded text-sm hover:bg-green-600">
        导出 TEI/XML
      </button>
    </div>

    <!-- Center: Image + OCR overlay -->
    <div class="flex-1 relative bg-gray-950 overflow-hidden">
      <ImageCanvas v-if="store.currentDoc" />
      <div v-else class="flex items-center justify-center h-full text-gray-600">
        请上传古籍图片或加载示例文档
      </div>
    </div>

    <!-- Right: OCR results & annotations -->
    <div ref="rightPanelRef" class="w-80 bg-gray-900 p-4 flex flex-col gap-3 border-l border-gray-800 overflow-y-auto"
      style="scroll-behavior: smooth;">
      <h3 class="text-amber-300 font-bold text-sm">OCR 识别结果</h3>
      <div v-if="store.currentDoc" class="space-y-2">
        <div v-for="(r, idx) in store.currentDoc.results" :key="r.id"
          :ref="el => setResultRef(el as HTMLElement, r.id)"
          class="bg-gray-800 rounded p-2 text-sm transition-all duration-300"
          :class="store.highlightedResultId === r.id ? 'ring-2 ring-amber-400 bg-amber-900/20 shadow-lg shadow-amber-500/10' : ''">
          <div class="flex justify-between items-start">
            <span class="text-white font-medium" v-html="highlightText(r.text, store.searchQuery)"></span>
            <div class="flex items-center gap-1 shrink-0 ml-2">
              <span class="text-[9px] font-mono text-gray-500">{{ idx + 1 }}</span>
              <span class="text-xs px-2 py-0.5 rounded"
                :class="r.confidence > 0.9 ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'">
                {{ (r.confidence * 100).toFixed(0) }}%
              </span>
            </div>
          </div>
          <div class="text-xs text-gray-400 mt-1">
            简体: <span v-html="highlightText(store.convertVariant(r.text), store.searchQuery)"></span>
          </div>
          <input v-model="r.corrected" placeholder="人工校正..."
            class="w-full bg-gray-700 rounded px-2 py-1 text-xs mt-1" />
        </div>
      </div>

      <h3 class="text-amber-300 font-bold text-sm mt-4">标注列表</h3>
      <div v-if="store.currentDoc" class="space-y-1">
        <div v-for="a in store.currentDoc.annotations" :key="a.id"
          class="bg-gray-800 rounded p-2 text-xs flex justify-between">
          <span>[{{ a.type }}] {{ a.label }}: {{ a.content }}</span>
          <button @click="store.removeAnnotation(a.id)" class="text-red-400 hover:underline">删除</button>
        </div>
        <div v-if="!store.currentDoc.annotations.length" class="text-gray-600 text-xs">
          在图片上拖拽框选区域添加标注
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useOcrStore } from './store/ocr'
import ImageCanvas from './components/ImageCanvas.vue'
import type { SearchHit } from './types'

const store = useOcrStore()
const rightPanelRef = ref<HTMLElement | null>(null)
const resultRefs = new Map<string, HTMLElement>()

const totalHits = computed(() => store.searchGroups.reduce((sum, g) => sum + g.hitCount, 0))

function setResultRef(el: HTMLElement | null, id: string) {
  if (el) {
    resultRefs.set(id, el)
  } else {
    resultRefs.delete(id)
  }
}

function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) store.uploadAndOCR(file)
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text)
  const q = query.trim()
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return escapeHtml(text).replace(regex, '<mark class="bg-amber-500/40 text-amber-200 px-0.5 rounded">$1</mark>')
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

async function jumpAndScroll(hit: SearchHit) {
  store.jumpToSearchHit(hit)
  await nextTick()
  await nextTick()
  const el = resultRefs.get(hit.result.id)
  if (el && rightPanelRef.value) {
    const panelRect = rightPanelRef.value.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset = elRect.top - panelRect.top - panelRect.height / 2 + elRect.height / 2
    rightPanelRef.value.scrollBy({ top: offset, behavior: 'smooth' })
  }
}

watch(() => store.highlightedResultId, async (newId) => {
  if (!newId) return
  await nextTick()
  const el = resultRefs.get(newId)
  if (el && rightPanelRef.value) {
    const panelRect = rightPanelRef.value.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset = elRect.top - panelRect.top - panelRect.height / 2 + elRect.height / 2
    rightPanelRef.value.scrollBy({ top: offset, behavior: 'smooth' })
  }
})

function doExport() {
  const tei = store.exportTEI()
  if (!tei) return
  const blob = new Blob([tei], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.currentDoc?.name || 'export'}.xml`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
