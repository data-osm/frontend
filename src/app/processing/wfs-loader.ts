import { loadFeaturesXhr } from "ol/featureloader";
import { Coordinate, FeatureLike, GeoJSON, Point } from "../ol-module";
import { Projection } from "ol/proj";
import { Extent } from "ol/extent";

export type loaderFn<F extends FeatureLike> = (extent: Extent, resolution: number, projection: Projection) => Promise<F[]>

export const getUrl = (base_url, identifiants) => {
    return (bbox: [number, number, number, number]) => {
        return `${base_url +
            '?VERSION=1.1.0' +
            '&SERVICE=WFS' +
            '&request=GETFEATURE' +
            '&typename=' + identifiants +
            '&outputFormat=GeoJSON' +
            '&SRSNAME=EPSG:3857' +
            '&startIndex=0' +
            '&bbox='
            }${bbox.join(',')}`;
    }

}
export function xhr<T extends FeatureLike>(url, format): loaderFn<T> {

    return function (extent, resolution, projection) {
        return new Promise((resolve, reject) => {
            loadFeaturesXhr(
                url,
                format,
                extent,
                resolution,
                projection,
                /**
                 * @param {Array<FeatureType>} features The loaded features.
                 * @param {import("./proj/Projection.js").default} dataProjection Data
                 * projection.
                 */
                function (features: T[], dataProjection) {
                    resolve(features);
                },
                () => {
                    reject()
                }
            );
        })

    };
}