export async function waitForMs(milliseconds: number) {
    await new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}