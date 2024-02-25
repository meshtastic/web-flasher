export function downloadBlob(url: string, filename: string) {
    console.log('Downloading blob', url, filename);
	let link = document.createElement('a')
	link.href = window.URL.createObjectURL(url)
	link.download = filename

	document.body.appendChild(link);
	link.click()
	document.body.removeChild(link);
}

export function convertToBinaryString(bytes: Uint8Array) {
	let binaryString = "";
	for (let i = 0; i < bytes.length; i++) {
		binaryString += String.fromCharCode(bytes[i]);
	}
	return binaryString;
}

export function checkIfRemoteFileExists(url: string): Promise<boolean> {
	return fetch(url, { method: 'HEAD' })
		.then(response => {
			return response.ok;
		})
		.catch(() => {
			return false;
		});
}