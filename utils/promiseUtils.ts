export function sleeper(ms: number) {
    return (x: any) => new Promise(resolve => setTimeout(() => resolve(x), ms));
}