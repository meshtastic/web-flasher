import {
  BlobReader,
  BlobWriter,
  ZipReader,
} from '@zip.js/zip.js'

export interface ZipEntryResult {
  filename: string
  blob: Blob
}

type ZipEntryWithData = { filename: string, getData: (writer: BlobWriter) => Promise<Blob> }

function hasGetData(entry: unknown): entry is ZipEntryWithData {
  return !!entry && typeof (entry as any).getData === 'function'
}

/**
 * Find the first entry in a zip matching the predicate and extract its data
 * @param zip - The zip file contents (uploaded File or downloaded Blob)
 * @param matcher - Predicate applied to each entry filename
 * @returns The matching entry's filename and data, or undefined if not found
 */
export async function extractZipEntry(zip: Blob, matcher: (filename: string) => boolean): Promise<ZipEntryResult | undefined> {
  const zipReader = new ZipReader(new BlobReader(zip))
  try {
    const entries = await zipReader.getEntries()
    const entry = entries.find(e => matcher(e.filename))
    if (!entry || !hasGetData(entry)) return undefined
    const blob = await entry.getData(new BlobWriter())
    return { filename: entry.filename, blob }
  }
  finally {
    await zipReader.close()
  }
}

/**
 * List the entry filenames in a zip without extracting any data
 * @param zip - The zip file contents (uploaded File or downloaded Blob)
 */
export async function listZipEntries(zip: Blob): Promise<string[]> {
  const zipReader = new ZipReader(new BlobReader(zip))
  try {
    const entries = await zipReader.getEntries()
    return entries.map(e => e.filename)
  }
  finally {
    await zipReader.close()
  }
}
