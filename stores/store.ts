export function createUrl(relativeUrl: string) {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    return `${base}/${relativeUrl}`;
}