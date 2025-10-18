import { HttpClient } from "@angular/common/http";
import { from, last, map, Observable, of, switchMap } from "rxjs";
import { CanvasTexture, ClampToEdgeWrapping, DataArrayTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, UnsignedByteType } from "three";
// import data from '../../../../assets/icu/stations-grenoble.json';

const textureSWidth = 256
const textureSHeight = 64

interface Stations {
    [key: string]: {
        [key: string]: {
            [key: string]: {
                valeurs_capteurs: number
                versoud_data: number
            }
        }
    }
}

let stations: Stations = {}
const stationIcuTexture: { [key: string]: { ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement } } = {}
let packedTexture: DataArrayTexture
let lastTextureGeneratedAt: Date

export const listStations = async function () {
    if (Object.keys(stations).length > 0) {
        return stations
    }
    await fetch('assets/icu/stations-grenoble.json')
        .then(response => response.json())
        .then(data => {
            stations = data
            return data
        })
        .catch(err => console.error('Erreur de chargement du JSON :', err));
}


const getOutLineTexture = function (params: {
    width: number, height: number
}) {
    const canvas = document.createElement('canvas');
    canvas.width = params.width;
    canvas.height = params.height;
    const ctx = canvas.getContext('2d');

    // const texture = new CanvasTexture(canvas);
    // texture.wrapS = texture.wrapT = ClampToEdgeWrapping
    return { ctx, canvas }
}

const updateOutLineTexture = function (params: {
    text: string,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
}) {
    const cssW = params.canvas.width;
    const cssH = params.canvas.height;

    params.ctx.clearRect(0, 0, params.ctx.canvas.width, params.ctx.canvas.height);

    params.ctx.font = '48px Arial';
    params.ctx.fillStyle = 'white';
    params.ctx.textAlign = 'center';
    params.ctx.textBaseline = 'middle';

    params.ctx.fillText(params.text, cssW / 2, cssH / 2);
    // document.querySelector(".scene-settings-form").appendChild(params.canvas)
}

export const createIcuTexture = function (date: Date) {
    date.setMinutes(0, 0, 0)
    for (const station_id in stations) {
        const station = stations[station_id];
        const fullDate = date.toISOString().split('T')[0];
        const hours = String(date.getHours()).padStart(2, '0');
        const fullHours = `${hours}:00`;

        const stationProperties = station[fullDate][fullHours]
        const stationIcu = stationProperties.valeurs_capteurs - stationProperties.versoud_data
        const { ctx, canvas } = getOutLineTexture({ width: textureSWidth, height: textureSHeight })
        updateOutLineTexture({ text: parseFloat(stationIcu.toString()).toFixed() + "°", ctx, canvas })

        stationIcuTexture[station_id] = {
            ctx,
            canvas
        }
    }
    lastTextureGeneratedAt = date
    packedTexture = canvasesToTextureArray()
    return packedTexture
}

export const updateIcuTexture = function (date: Date) {
    date.setMinutes(0, 0, 0)
    if (date.valueOf() === lastTextureGeneratedAt.valueOf() && packedTexture) {
        return packedTexture
    }
    lastTextureGeneratedAt = date
    for (const station_id in stations) {
        const station = stations[station_id];
        const fullDate = date.toISOString().split('T')[0];
        const hours = String(date.getHours()).padStart(2, '0');
        const fullHours = `${hours}:00`;

        const stationProperties = station[fullDate][fullHours]
        const stationIcu = stationProperties.valeurs_capteurs - stationProperties.versoud_data

        const { ctx, canvas } = stationIcuTexture[station_id]
        updateOutLineTexture({ text: parseFloat(stationIcu.toString()).toFixed() + "°", ctx, canvas })
    }

    packedTexture = canvasesToTextureArray()
    return packedTexture
}
/**
 * Construit un THREE.DataArrayTexture à partir d'une liste de canvases RGBA.
 */
export function canvasesToTextureArray(): DataArrayTexture {
    const canvases = Object.values(stationIcuTexture).map((station) => station.canvas);

    if (!canvases.length) throw new Error('Aucun canvas fourni.');
    const w = canvases[0].width;
    const h = canvases[0].height;

    const layers = canvases.length;
    const bytesPerPixel = 4; // RGBA8
    const data = new Uint8Array(w * h * layers * bytesPerPixel);

    // Copie des pixels de chaque canvas dans le gros buffer
    for (let layer = 0; layer < layers; layer++) {
        const ctx = canvases[layer].getContext('2d');
        if (!ctx) throw new Error(`Impossible de récupérer le contexte 2D du canvas #${layer}.`);
        const img = ctx.getImageData(0, 0, w, h).data;

        // Offset de la couche dans le buffer
        const offset = layer * w * h * bytesPerPixel;
        data.set(img, offset);
    }

    // Création de la texture array
    const tex = new DataArrayTexture(data, w, h, layers);

    tex.wrapS = ClampToEdgeWrapping;
    tex.wrapT = ClampToEdgeWrapping;
    tex.flipY = true

    tex.needsUpdate = true;

    return tex;
}