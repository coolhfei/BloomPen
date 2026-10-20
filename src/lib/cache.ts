import type { GenResult } from './types'

/**
 * IndexedDB 缓存最近一次成功生成结果（含英雄图 dataURL）。
 * 演示模式直接回放缓存，是现场断网/API 故障时的兜底。
 */
const DB_NAME = 'brandforge'
const STORE = 'cache'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveResult(result: GenResult): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(result, 'latest')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (e) {
    console.warn('缓存写入失败', e)
  }
}

export async function loadResult(): Promise<GenResult | null> {
  try {
    const db = await openDB()
    const value = await new Promise<GenResult | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get('latest')
      req.onsuccess = () => resolve((req.result as GenResult) ?? null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return value
  } catch {
    return null
  }
}

/** 把英雄图 URL 转成 dataURL 存入缓存（OSS 地址 24h 过期） */
export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}
