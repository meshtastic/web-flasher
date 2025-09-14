/**
 * Utility functions for firmware version comparisons
 */

/**
 * Compare two semantic version strings
 * @param version1 First version string (e.g., "2.7.9")
 * @param version2 Second version string (e.g., "2.7.8") 
 * @returns Positive if version1 > version2, negative if version1 < version2, 0 if equal
 */
export function compareVersions(version1: string, version2: string): number {
  // Remove 'v' prefix if present
  const clean1 = version1.replace(/^v/, '');
  const clean2 = version2.replace(/^v/, '');
  
  // Split into parts and convert to numbers
  const parts1 = clean1.split('.').map(part => {
    // Handle pre-release versions like "2.7.9.abc123" - take only the numeric part
    const numeric = part.match(/^\d+/);
    return numeric ? parseInt(numeric[0], 10) : 0;
  });
  
  const parts2 = clean2.split('.').map(part => {
    const numeric = part.match(/^\d+/);
    return numeric ? parseInt(numeric[0], 10) : 0;
  });
  
  // Pad shorter version with zeros
  const maxLength = Math.max(parts1.length, parts2.length);
  while (parts1.length < maxLength) parts1.push(0);
  while (parts2.length < maxLength) parts2.push(0);
  
  // Compare each part
  for (let i = 0; i < maxLength; i++) {
    const diff = parts1[i] - parts2[i];
    if (diff !== 0) return diff;
  }
  
  return 0;
}

/**
 * Check if a firmware version is greater than or equal to a target version
 * @param currentVersion Current firmware version
 * @param targetVersion Target version to compare against
 * @returns true if currentVersion >= targetVersion
 */
export function isVersionGreaterOrEqual(currentVersion: string, targetVersion: string): boolean {
  return compareVersions(currentVersion, targetVersion) >= 0;
}

/**
 * Check if current firmware version supports the new 8MB partition table
 * @param firmwareVersion Current firmware version
 * @returns true if firmware version is 2.7.9 or above
 */
export function supportsNew8MBPartitionTable(firmwareVersion: string): boolean {
  return isVersionGreaterOrEqual(firmwareVersion, '2.7.9');
}