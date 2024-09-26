export function createSlipHeader(seq: number, dip: number, rp: number, pktType: number, pktLen: number) {
    let ints = [0, 0, 0, 0];
    ints[0] = seq | (((seq + 1) % 8) << 3) | (dip << 6) | (rp << 7);
    ints[1] = pktType | ((pktLen & 0x000F) << 4);
    ints[2] = (pktLen & 0x0FF0) >> 4;
    ints[3] = (~(ints[0] + ints[1] + ints[2]) + 1) & 0xFF;
    return new Uint8Array(ints);
}

export function crc16(binaryData: Uint8Array, crc = 0xffff) : number {
    binaryData.forEach(b => {
        crc = (crc >> 8 & 0x00FF) | (crc << 8 & 0xFF00);
        crc ^= b;
        crc ^= (crc & 0x00FF) >> 4;
        crc ^= (crc << 8) << 4;
        crc ^= ((crc & 0x00FF) << 4) << 1;
    });

    return crc & 0xFFFF;
}
   
export function slipEncodeEscChars(data: number[]) : Uint8Array {
    return Uint8Array.from([...data].flatMap((b: number) => {
            if (b === 0xC0) {
            return [0xDB, 0xDC];
            } else if (b === 0xDB) {
            return [0xDB, 0xDD];
            } else {
            return [b];
            }
        }));
}

export function int16ToBytes(num: number): Uint8Array {
    return new Uint8Array([
        (num & 0x00ff),
        (num & 0xff00) >> 8,
    ]);
}

export function int32ToBytes(num: number): Uint8Array {
    return new Uint8Array([
        (num & 0x000000ff),
        (num & 0x0000ff00) >> 8,
        (num & 0x00ff0000) >> 16,
        (num & 0xff000000) >> 24,
    ]);
}