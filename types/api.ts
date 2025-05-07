import manifest from '../public/data/manifest.json';

export interface FirmwareResource {
	id: string;
	title: string;
	page_url?: string;
	zip_url?: string;
	release_notes?: string;
}

export interface FirmwareReleases {
	releases: {
		stable: FirmwareResource[];
		alpha: FirmwareResource[];
	};
	pullRequests: FirmwareResource[];
}

export interface DeviceHardware {
	hwModel: number;
	hwModelSlug: string;
	platformioTarget: string;
	architecture: string;
	activelySupported: boolean;
	displayName: string;
	supportLevel?: number;
	tags?: string[];
	images?: string[];
	partitionScheme?: string;
	hasMui?: boolean;
	hasInkHud?: boolean;
}

export function getCorsFriendyReleaseUrl(url: string) {
	const zipName = url.split('/').slice(-1)[0];
	const firmwareName = zipName.replace('.zip', '')
		.replace('-esp32-', '-')
		.replace('-esp32c3-', '-')
		.replace('-esp32c6-', '-')
		.replace('-esp32s3-', '-')
		.replace('-nrf52840-', '-')
		.replace('-stm32-', '-')
		.replace('-rp2040-', '-')

	// Try to get the githubioPrefix from manifest.json
	let githubioPrefix = '';
	try {
		// Use require to load the manifest
		if (manifest.release.githubioPrefix) {
			githubioPrefix = manifest.release.githubioPrefix;
			return `https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master/${githubioPrefix}/${firmwareName}`;
		}
	} catch (e) {
		// If manifest.json doesn't exist or doesn't have githubioPrefix, continue without it
		console.warn('Could not read githubioPrefix from manifest.json:', e);
	}

	// Construct the CDN URL with optional prefix
	return `https://raw.githubusercontent.com/meshtastic/meshtastic.github.io/master/${firmwareName}`;
}
