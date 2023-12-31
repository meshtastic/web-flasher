export function downloadBlob(url: string, filename: string) {
    console.log('Downloading blob', url, filename);
	let link = document.createElement('a')
	link.href = window.URL.createObjectURL(url)
	link.download = filename

	document.body.appendChild(link);
	link.click()
	document.body.removeChild(link);
}