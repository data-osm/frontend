
// --- Types d'entrée (tes JSON) ---
export type BufferAttributeJSON = {
    itemSize: number;
    type: string;              // "Float32Array" | "Uint16Array" | ...
    array: number[];
    normalized?: boolean;
};

export type InterleavedAttrJSON = {
    isInterleavedBufferAttribute: true;
    itemSize: number;
    data: string;              // binaire encodé (ex. base64)
    offset: number;            // en composantes
    normalized: boolean;
    stride?: number;           // en composantes (recommandé)
    type?: string;             // type du buffer interleavé, ex. "Float32Array"
};

export interface ExtrudedTile {
    boundingBoxMinMax: [number, number, number, number, number, number];
    worldBuildingPosition: [number, number, number]
    tile_key: string;
    geometriesJson: InputAttr[];
}

export type InputAttr = { key: string; data: BufferAttributeJSON | InterleavedAttrJSON };
export interface InputExtruded extends ExtrudedTile { tileId: string; id: number; };

// --- Format "wire" (transferable) ---
type AnyTyped =
    Float32Array | Uint32Array | Uint16Array |
    Int32Array | Int16Array | Int8Array | Uint8Array;

export type WireAttr =
    | { kind: 'attr'; key: string; itemSize: number; normalized: boolean; array: AnyTyped }
    | { kind: 'interleaved'; key: string; itemSize: number; normalized: boolean; stride: number; offset: number; array: AnyTyped };

export type WireExtruded = { tile_key: string; tileId: string; id: number; worldBuildingPosition: [number, number, number]; boundingBoxMinMax: AnyTyped; attrs: WireAttr[] };

// --- Helpers ---
function toTyped(type: string | undefined, src: number[] | ArrayBuffer): AnyTyped {
    switch (type) {
        case 'Uint32Array': return src instanceof ArrayBuffer ? new Uint32Array(src) : new Uint32Array(src as number[]);
        case 'Uint16Array': return src instanceof ArrayBuffer ? new Uint16Array(src) : new Uint16Array(src as number[]);
        case 'Int32Array': return src instanceof ArrayBuffer ? new Int32Array(src) : new Int32Array(src as number[]);
        case 'Int16Array': return src instanceof ArrayBuffer ? new Int16Array(src) : new Int16Array(src as number[]);
        case 'Int8Array': return src instanceof ArrayBuffer ? new Int8Array(src) : new Int8Array(src as number[]);
        case 'Uint8Array': return src instanceof ArrayBuffer ? new Uint8Array(src) : new Uint8Array(src as number[]);
        case 'Float32Array':
        default: return src instanceof ArrayBuffer ? new Float32Array(src) : new Float32Array(src as number[]);
    }
}

function base64ToAB(b64: string): ArrayBuffer {
    const bin = atob(b64);
    const len = bin.length;
    const buf = new ArrayBuffer(len);
    const view = new Uint8Array(buf);
    for (let i = 0; i < len; i++) view[i] = bin.charCodeAt(i) & 0xff;
    return buf;
}

// --- PACKER principal ---
/**
 * Convertit extrudedBuildings JSON -> wire (TypedArray) + transfer list.
 * À utiliser côté worker avant postMessage.
 */
export function packExtrudedForTransfer(
    extruded: InputExtruded[]
): { wire: WireExtruded[]; transfers: Transferable[] } {
    const wire: WireExtruded[] = [];
    const transfers: Transferable[] = [];
    const seen = new Set<ArrayBufferLike>();

    for (const e of extruded) {
        const attrs: WireAttr[] = [];

        for (const g of e.geometriesJson) {
            const d: any = g.data;

            if (d.isInterleavedBufferAttribute) {
                // Interleaved: data est une chaîne -> ArrayBuffer -> TypedArray
                const ab = base64ToAB(d.data);
                const arr = toTyped(d.type ?? 'Float32Array', ab);
                const stride = (d.stride ?? d.itemSize) | 0;

                attrs.push({
                    kind: 'interleaved',
                    key: g.key,
                    itemSize: d.itemSize | 0,
                    normalized: !!d.normalized,
                    stride,
                    offset: d.offset | 0,
                    array: arr,
                });

                if (!seen.has(arr.buffer)) { seen.add(arr.buffer); transfers.push(arr.buffer); }

            } else {
                // BufferAttribute simple: array:number[] -> TypedArray
                const arr = toTyped(d.type, d.array);
                attrs.push({
                    kind: 'attr',
                    key: g.key,
                    itemSize: d.itemSize | 0,
                    normalized: !!d.normalized,
                    array: arr,
                });

                if (!seen.has(arr.buffer)) { seen.add(arr.buffer); transfers.push(arr.buffer); }
            }
        }
        const boundingBoxMinMax = Float32Array.from(e.boundingBoxMinMax)
        transfers.push(Float32Array.from(e.boundingBoxMinMax).buffer)

        wire.push({ tile_key: e.tile_key, tileId: e.tileId, id: e.id, worldBuildingPosition: e.worldBuildingPosition, boundingBoxMinMax, attrs });
    }

    return { wire, transfers };
}


export const formatBufferGeometryAttributes = function (geometriesJson: {
    key: string;
    data: BufferAttributeJSON | {
        isInterleavedBufferAttribute: true;
        itemSize: number;
        data: string;
        offset: number;
        normalized: boolean;
    };
}[]) {
    const attrs: WireAttr[] = [];
    for (const g of geometriesJson) {
        const d: any = g.data;

        if (d.isInterleavedBufferAttribute) {
            // Interleaved: data est une chaîne -> ArrayBuffer -> TypedArray
            const ab = base64ToAB(d.data);
            const arr = toTyped(d.type ?? 'Float32Array', ab);
            const stride = (d.stride ?? d.itemSize) | 0;

            attrs.push({
                kind: 'interleaved',
                key: g.key,
                itemSize: d.itemSize | 0,
                normalized: !!d.normalized,
                stride,
                offset: d.offset | 0,
                array: arr,
            });


        } else {
            // BufferAttribute simple: array:number[] -> TypedArray
            const arr = toTyped(d.type, d.array);
            attrs.push({
                kind: 'attr',
                key: g.key,
                itemSize: d.itemSize | 0,
                normalized: !!d.normalized,
                array: arr,
            });

        }
    }
    return attrs
}