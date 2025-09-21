// @ts-expect-error
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import { get as getProjection, Projection, transform } from 'ol/proj';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import { Coordinate } from 'ol/coordinate';
import { getForProjection as getTileGridForProjection, TileGrid } from 'ol/tilegrid';
import { DataTexture } from 'three/src/textures/DataTexture';
import { FloatType, LinearFilter, RGFormat } from 'three';
import { ElevationFeature, GeometryType } from './pool';
import { environment } from '../../../environments/environment';


proj4.defs('IGNF:WGS84G', 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]');
register(proj4);

const ELEVATION_LAYER = "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES"
const ELEVATION_DEFAULT_RESOLUTION = 8
const ELEVATION_DEFAULT_ZOOM = 14

const elevationCache = new Map<string, Promise<DataView>>();
const enableTerrain = environment.enabledTerrain


/**
* Renvoie l'altitude max dans un rayon donné autour de (px,py)
* @param {DataView} view    DataView sur l'ArrayBuffer de la tuile BIL
* @param {number} px        coordonnée x du pixel central (0–255)
* @param {number} py        coordonnée y du pixel central (0–255)
* @param {number} radius    rayon en pixels (ici 10)
* @param {number} tileSize  taille de la tuile (256)
*/
function _maxElevationInRadius(view: DataView, px: number, py: number, radius: number, tileSize = 256) {
    const radiusSq = radius * radius;
    let max = -Infinity;

    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radiusSq) {
                const x = px + dx;
                const y = py + dy;
                // vérification des limites (bord de tuile)
                if (x >= 0 && x < tileSize && y >= 0 && y < tileSize) {
                    const index = y * tileSize + x;
                    const byteOffset = index * 4;      // 4 octets par float32
                    const val = view.getFloat32(byteOffset, true);
                    if (val > max) max = val;
                }
            }
        }
    }

    if (max === -Infinity) {
        console.log(px, py, "no max in radius");
    };


    return max;
}

async function getElevationArrayBuffer(tileCol: number, tileRow: number, size: number) {
    const cacheKey = `${tileCol},${tileRow}`;

    if (elevationCache.has(cacheKey)) {
        return elevationCache.get(cacheKey)!; // ! car on est sûr qu'il existe
    }

    const promise = (async () => {
        // console.log(tileCol, tileRow)
        const url = new URL('https://data.geopf.fr/wmts');
        url.searchParams.set('SERVICE', 'WMTS');
        url.searchParams.set('LAYER', 'ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES');
        url.searchParams.set('STYLE', 'normal');
        url.searchParams.set('TILEMATRIXSET', 'WGS84G_6_14');
        url.searchParams.set('REQUEST', 'GetTile');
        url.searchParams.set('VERSION', '1.0.0');
        url.searchParams.set('TILEMATRIX', ELEVATION_DEFAULT_ZOOM.toString());
        url.searchParams.set('TILECOL', tileCol.toString());
        url.searchParams.set('TILEROW', tileRow.toString());
        url.searchParams.set('FORMAT', 'image/x-bil;bits=32');

        return fetch(url.toString()).then((response) => {
            return response.arrayBuffer().then((buffer) => {
                const dataView = new DataView(buffer)
                return dataView
            });
        });
    })()


    elevationCache.set(cacheKey, promise);
    return promise;
}

/**
 * Coordinates must be in IGNF:WGS84G
 * coordinates_with_index : [longitude, latitude, index]
 * Return an array of Map[index, elevation]
 */
export default async function listElevation(features: Array<ElevationFeature>, capabilities): Promise<Array<ElevationFeature>> {
    let coordinates_with_index: [number, number, number | string][] = []
    if (!features || !features.length) {
        return []
    }

    features.map((feature, index) => {
        if (!Boolean(feature.geometryType) || feature.geometryType == "Point") {
            const point = feature.center
            // const transformCoordinate = transform(point, this.map.extent.crs, "IGNF:WGS84G")
            const coordinate_with_index: [number, number, number] = [point[0], point[1], index]
            coordinates_with_index.push(coordinate_with_index)
        } else if (feature.geometryType == "LineString") {
            const coordinates = feature.coordinates as Array<Coordinate>
            coordinates.map((coordinate, coordinate_index) => {
                coordinates_with_index.push([coordinate[0], coordinate[1], index + "_" + "0" + "_" + coordinate_index])
            })
        } else if (feature.geometryType == "MultiLineString" || feature.geometryType == "Polygon") {
            const coordinates = feature.coordinates as Array<Array<Coordinate>>
            coordinates.map((line_string, line_string_index) => {
                line_string.map((coord, coordinate_index) => {
                    coordinates_with_index.push([coord[0], coord[1], index + "_" + line_string_index + "_" + coordinate_index])
                })
            })
        } else if (feature.geometryType == "MultiPolygon") {
            const coordinates = feature.coordinates as Array<Array<Array<Coordinate>>>
            coordinates.map((polygon, polygon_index) => {
                polygon.map((line_string, line_string_index) => {
                    line_string.map((coord, coordinate_index) => {
                        coordinates_with_index.push([coord[0], coord[1], index + "_" + polygon_index + "_" + line_string_index + "_" + coordinate_index])
                    })
                })
            })
        }

    })


    coordinates_with_index = coordinates_with_index.map((coordinate_with_index) => {
        const coordinate2D = [coordinate_with_index[0], coordinate_with_index[1]];
        const coordinate = transform(coordinate2D, "EPSG:3857", "IGNF:WGS84G")
        return [coordinate[0], coordinate[1], coordinate_with_index[2]]
    })

    let source: WMTS
    let tileGrid: TileGrid
    if (enableTerrain) {
        const olOptions = optionsFromCapabilities(capabilities, { layer: ELEVATION_LAYER });
        source = new WMTS(olOptions)
        // @ts-expect-error
        source.tileGrid.origin_ = source.tileGrid.origins_[0]
        tileGrid = source.tileGrid
    } else {

        tileGrid = getTileGridForProjection(new Projection({
            code: 'EPSG:3857',
        }))
    }

    const resolution = tileGrid.getResolution(ELEVATION_DEFAULT_RESOLUTION);

    const getElevation = async (tileCol: number, tileRow: number, px: number, py: number) => {
        if (source) {
            const size = tileGrid.getTileSize(0) as number
            const view = await getElevationArrayBuffer(tileCol, tileRow, size);
            return _maxElevationInRadius(view, px, py, 5, size);
        }
        return 0.1
    }


    const tileCoordMap = new Map<[number, number], [number, number, number | string][]>(); // key: "col,row" → array of coordinates

    for (let coordinate_with_index of coordinates_with_index) {
        const coordinate2D = [coordinate_with_index[0], coordinate_with_index[1]];
        const coordinate = [coordinate_with_index[0], coordinate_with_index[1]];
        const [, col, row] = tileGrid.getTileCoordForCoordAndResolution(coordinate, resolution);
        const key: [number, number] = [col, row];

        if (!tileCoordMap.has(key)) {
            tileCoordMap.set(key, []);
        }
        tileCoordMap.get(key)!.push(coordinate_with_index);
    }


    await Promise.all(
        Array.from(tileCoordMap.entries()).map(async ([[tileCol, tileRow], tile_coordinates_with_index]) => {
            const olExtent = tileGrid.getTileCoordExtent([ELEVATION_DEFAULT_RESOLUTION, tileCol, tileRow]);

            const [minX, minY, maxX, maxY] = olExtent;

            for (const [lon, lat, index] of tile_coordinates_with_index) {
                const px = Math.floor((lon - minX) / resolution);
                const py = Math.floor((maxY - lat) / resolution);
                let elevation = await getElevation(tileCol, tileRow, px, py);

                // point
                if (typeof index === "number") {
                    features[index].properties.elevation = elevation
                } else {
                    if (index.toString().split("_").length == 3) {
                        const [feature_index, line_string_index, coordinate_index] = index.toString().split("_")
                        if (features[feature_index].geometryType == "LineString") {
                            const coordinates = features[feature_index].coordinates as Array<Coordinate>
                            coordinates[coordinate_index] = [coordinates[coordinate_index][0], coordinates[coordinate_index][1], elevation]
                        } else if (features[feature_index].geometryType == "MultiLineString" || features[feature_index].geometryType == "Polygon") {
                            const coordinates = features[feature_index].coordinates as Array<Array<Coordinate>>
                            coordinates[line_string_index][coordinate_index] = [coordinates[line_string_index][coordinate_index][0], coordinates[line_string_index][coordinate_index][1], elevation]
                        }
                    } else {
                        const [feature_index, polygon_index, line_string_index, coordinate_index] = index.toString().split("_")
                        const coordinates = features[feature_index].coordinates as Array<Array<Array<Coordinate>>>
                        coordinates[polygon_index][line_string_index][coordinate_index] = [coordinates[polygon_index][line_string_index][coordinate_index][0], coordinates[polygon_index][line_string_index][coordinate_index][1], elevation]
                    }

                }

            }
        })
    );

    return features


    // })
}