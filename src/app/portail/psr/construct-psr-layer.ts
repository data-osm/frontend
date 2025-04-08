import { ColorLayer, Instance, OrbitControls, TiledImageSource, Map as Giro3DMap, } from "../../giro-3d-module"
import { DataOSMLayer, } from "../../../helper/type"
import { getProjection, OSM, TileWMS, VectorSource, GeoJSON, VectorLayer, Cluster, Style, CircleStyle, Stroke, Fill, Icon, transformExtent } from "../../ol-module"
import { filter, ReplaySubject, takeUntil, map as rxjsMap, tap, retryWhen, delayWhen, timer, take } from "rxjs"
import { PointsLayer } from "../../processing/points"
import { fromInstanceGiroEvent } from "../../shared/class/fromGiroEvent"
import { CartoHelper } from "../../../helper/carto.helper"
import { PerspectiveCamera } from "three"
import { environment } from "../../../environments/environment"
import { HttpErrorResponse } from "@angular/common/http"
import { RailLineString } from "../../processing/linestring/rail-linestring"
import { TramLineString } from "../../processing/linestring/tram-linestring"
import { VerticalTrafficSignLayer } from "../../processing/vertical-traffic-sign"
import { TubeLineStringLayer } from "../../processing/linestring/tube-linestring"
import { Target, TextureAndPitch } from "@giro3d/giro3d/core/layer/Layer"

class ColorLayerWithoutFog extends ColorLayer {
    applyTextureToNode(result: TextureAndPitch, target: Target) {
        super.applyTextureToNode(result, target)
        // @ts-expect-error
        target.node.material.fog = false
    }
}
/**
   * Construct a layer with giro 3D
   * @param couche geosmLayer the layer to construct
   * @return VectorLayer|ImageLayer the layer costructed
   */
export function constructPSRLayer(map: Giro3DMap, instance: Instance, controls: OrbitControls, couche: DataOSMLayer): ColorLayer {
    let layer: ColorLayer

    if (couche.type == "xyz") {
        layer = new ColorLayerWithoutFog({
            name: couche.nom,
            // showTileBorders: true,
            source: new TiledImageSource({
                extent: map.extent,
                source: new OSM({ url: couche.url })

            }),
        })


    } else if (couche.type == "wms") {

        let params: { [key: string]: any; } = {
            'LAYERS': couche.identifiant.join(','),
            'TILED': true
        }
        if (couche.styleWMS && couche.styleWMS.length > 0) {
            params['STYLE'] = couche.styleWMS.join(',')
        }

        var wmsSourceTile = new TileWMS({
            url: couche.url,
            params: params,
            serverType: 'qgis',
            crossOrigin: 'anonymous',
            projection: getProjection('EPSG:3857'),
        });

        layer = new ColorLayer({
            name: couche.nom,
            source: new TiledImageSource({
                httpTimeout: 10000,
                source: wmsSourceTile,
            })
        })

        // if (couche.geometryType == "Point") {
        if (couche.geometryType == "Point" || couche.geometryType == "LineString") {
            couche["destroyedInstancedMesh$"] = new ReplaySubject(1);
            let threeLayer;
            if (couche.geometryType == "Point") {
                threeLayer = new VerticalTrafficSignLayer(
                    map,
                    couche,
                    11
                )
            }
            else {
                if (couche.nom == "Réseaux") {
                    threeLayer = new TubeLineStringLayer(
                        map,
                        couche,
                        11
                    )
                }
                if (couche.nom == "Tramway") {
                    threeLayer = new TramLineString(
                        map,
                        couche,
                        11
                    )
                }
                if (couche.nom == "Réseau ferroviaire") {
                    threeLayer = new RailLineString(
                        map,
                        couche,
                        11
                    )
                }


            }


            fromInstanceGiroEvent(instance, "after-camera-update").pipe(
                takeUntil(couche["destroyedInstancedMesh$"]),
                // User can set this layer not visible, in that case the both will not be visible 
                // So we prevent to go further if both are not visible
                filter(() => layer.visible || threeLayer.getVisible()),
                rxjsMap((instanceCamera) => {
                    return CartoHelper.getZAndMapWith(
                        map,
                        instanceCamera.camera.camera as PerspectiveCamera,
                        controls
                    )
                }),
                tap((zAndMapWith) => {
                    if (zAndMapWith[0] <= 11) {
                        layer.visible = true
                        threeLayer.makeUnVisible()
                    } else {
                        layer.visible = false
                        threeLayer.makeVisible()
                    }
                })
            ).subscribe()

        }

    }

    layer.visible = couche.visible

    return layer

}