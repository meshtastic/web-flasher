export function downloadBlob(url: string, filename: string) {
    console.log('Downloading blob', url, filename);
	let link = document.createElement('a')
	link.href = window.URL.createObjectURL(url)
	link.download = filename

	document.body.appendChild(link);
	link.click()
	document.body.removeChild(link);
}

export function convertToUint8Array(binaryString: string) {
	let bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}

export function convertToBinaryString(bytes: Uint8Array) {
	let binaryString = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binaryString += String.fromCharCode(bytes[i]);
	}
	return binaryString;
}

export function convertBytesToInt(byteArray: Uint8Array)  {
	let value = 0;
	for (let i = byteArray.length - 1; i >= 0; i--) {
        value = (value * 256) + byteArray[i];
    }
	return value;
}

export function calcChecksum(bytes: Uint8Array, segments: number) {
	let offset = 24;
	let hashValue = 0xEF;

	for (let i = 0; i < segments; i++) {
		let length = convertBytesToInt(bytes.slice(offset + 4, offset + 8));
		console.log(length);
		let segment = bytes.slice(offset + 8, offset+length+8);
		hashValue = segment.reduce((acc, byte) => acc ^ byte, hashValue);
		offset += length + 8;
	}
	return hashValue;
}

export async function checkIfRemoteFileExists(url: string): Promise<boolean> {
	console.log('Checking if remote file exists: ', url);
	try {
		const response = await fetch(url, { method: 'HEAD' });
		return response.ok;
	} catch {
		return false;
	}
}