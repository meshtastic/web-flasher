export function downloadBlob(url: string, filename: string) {
  console.log('Downloading blob', url, filename)
  const link = document.createElement('a')
  link.href = window.URL.createObjectURL(url)
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function convertToBinaryString(bytes: Uint8Array) {
  let binaryString = ''
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i])
  }
  return binaryString
}

export async function checkIfRemoteFileExists(url: string): Promise<boolean> {
  console.log('Checking if remote file exists: ', url)
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  }
  catch {
    return false
  }
}
