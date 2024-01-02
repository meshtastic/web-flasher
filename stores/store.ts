export function createUrl(relativeUrl: string) {
    const base = `${window.location.protocol}//${window.location.host}`;
    return `${base}/${relativeUrl}`;
}