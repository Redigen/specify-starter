const formatCacheKey = 'supported-image-format';
type ImageFormat = 'heic' | 'avif' | 'webp' | 'png';

function checkCanvasWebP(): boolean {
    if (typeof document === 'undefined') return false;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').startsWith('data:image/webp');
    } catch (e) {
        return false;
    }
}

const cachedFormat = typeof window !== 'undefined'
    ? localStorage.getItem(formatCacheKey)
    : null;

let initialFormat: ImageFormat = 'png';

if (cachedFormat === 'heic' || cachedFormat === 'avif' || cachedFormat === 'webp' || cachedFormat === 'png') {
    initialFormat = cachedFormat;
} else if (checkCanvasWebP()) {
    initialFormat = 'webp';
}

export const supportedImageFormat: ImageFormat = initialFormat;

const testImages: Record<string, string> = {
    heic: 'data:image/heic;base64,AAAAGGZ0eXBoZWljAAAAAG1pZjFoZWljAAABaW1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAADnBpdG0AAAAAAAEAAAAiaWxvYwAAAABEQAABAAEAAAAAAYkAAQAAAAAAAAArAAAAI2lpbmYAAAAAAAEAAAAVaW5mZQIAAAAAAQAAaHZjMQAAAADpaXBycAAAAMppcGNvAAAAdmh2Y0MBA3AAAAAAAAAAAAAe8AD8/fj4AAAPAyAAAQAYQAEMAf//A3AAAAMAkAAAAwAAAwAeugJAIQABACpCAQEDcAAAAwCQAAADAAADAB6gIIEFluqumubgIaDAgAAAAwCAAAADAIQiAAEABkQBwXPBiQAAABRpc3BlAAAAAAAAAEAAAABAAAAAKGNsYXAAAAABAAAAAQAAAAEAAAAB////wQAAAAL////BAAAAAgAAABBwaXhpAAAAAAMICAgAAAAXaXBtYQAAAAAAAAABAAEEgQIEgwAAADNtZGF0AAAAJygBrxMhMZb4TlCnlv1jAs0MlUxauU+lc90KUJNyfrj+8oeTxWKC4A==',
    avif: 'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAD6AAEAAAAAAAAAGgAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgQAMAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAibWRhdBIACggYAAYICGg0IDIMGAAKKKKEAACwEpqY',
    // webp: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='
};

function testFormat(format: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = testImages[format];
    });
}

export async function initImageFormat() {
    if (typeof window === 'undefined') return;

    if (localStorage.getItem(formatCacheKey)) return;

    const formatsToTest: ImageFormat[] = ['heic', 'avif'];

    for (const format of formatsToTest) {
        if (await testFormat(format)) {
            localStorage.setItem(formatCacheKey, format);
            return;
        }
    }

    localStorage.setItem(formatCacheKey, supportedImageFormat);
}
