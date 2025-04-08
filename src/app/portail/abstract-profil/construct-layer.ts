import { ColorLayer, TiledImageSource, Map as Giro3DMap, Instance, OrbitControls } from "../../giro-3d-module"
import { DataOSMLayer, } from "../../../helper/type"
import { getProjection, OSM, TileWMS, VectorSource, GeoJSON, VectorLayer, Cluster, Style, CircleStyle, Stroke, Fill, Icon, transformExtent } from "../../ol-module"
import { filter, ReplaySubject, takeUntil, map as rxjsMap, tap, retryWhen, delayWhen, timer, take } from "rxjs"
import { PointsLayer } from "../../processing/points"
import { fromInstanceGiroEvent } from "../../shared/class/fromGiroEvent"
import { CartoHelper } from "../../../helper/carto.helper"
import { PerspectiveCamera } from "three"
import { environment } from "../../../environments/environment"
import { Target, TextureAndPitch } from "@giro3d/giro3d/core/layer/Layer"
import { TramLineString } from "../../processing/linestring/tram-linestring"
import { RailLineString } from "../../processing/linestring/rail-linestring"
import { SubwayLineLineStringLayer } from "../../processing/linestring/subway-linestring"
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
export function constructLayer(map: Giro3DMap, instance: Instance, couche: DataOSMLayer): ColorLayer {
    let layer: ColorLayer

    if (couche.type == "xyz") {
        layer = new ColorLayerWithoutFog({
            name: couche.nom,
            // showTileBorders: true,
            source: new TiledImageSource({
                extent: map.extent,
                source: new OSM({ url: couche.url })

            })
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
        // console.log(couche.nom, couche)
        if (couche.geometryType == "Point" || couche.geometryType == "LineString") {
            couche["destroyedInstancedMesh$"] = new ReplaySubject(1);
            let threeLayer;
            if (couche.geometryType == "Point") {
                threeLayer = new PointsLayer(
                    map,
                    couche,
                    11
                )
            }

            else {

                if (couche.nom == "Ligne de tramway") {
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
                if (couche.nom == "Ligne de métro") {
                    threeLayer = new SubwayLineLineStringLayer(
                        map,
                        couche,
                        11
                    )
                }

            }

            // else {
            //   threeLayer = new FlatLineStringLayer(
            //     map,
            //     couche,
            //     11
            //   )
            // }


            fromInstanceGiroEvent(instance, "after-camera-update").pipe(
                takeUntil(couche["destroyedInstancedMesh$"]),
                // User can set this layer not visible, in that case the both will not be visible 
                // So we prevent to go further if both are not visible
                filter(() => layer.visible || threeLayer.getVisible()),
                rxjsMap((instanceCamera) => {
                    return CartoHelper.getZAndMapWith(
                        map,
                        instanceCamera.camera.camera as PerspectiveCamera,
                        instance.view.controls as OrbitControls
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

    // else if (couche.type == "geojson") {
    //     var vectorSource = new VectorSource({
    //         format: new GeoJSON(),
    //     })

    //     // layer = 
    //     new VectorLayer({
    //         source: vectorSource,
    //         style: couche.style,
    //         /**
    //       * so that map.forEachLayerAtPixel work as expected
    //       * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
    //       */
    //         className: couche.nom + '___' + couche.type_layer
    //     })

    //     if (couche.cluster) {
    //         var clusterSource = new Cluster({
    //             distance: 80,
    //             source: vectorSource
    //         });
    //         var styleCache = {};
    //         var styleCacheCopy = {}
    //         // layer = 
    //         new VectorLayer({
    //             source: clusterSource,
    //             style: (feature) => {
    //                 var size = feature.get('features').length;

    //                 if (size > 1) {

    //                     var styleDefault = styleCache[size];
    //                     if (!styleDefault) {
    //                         var radius = 10
    //                         if (size > 99) {
    //                             radius = 12, 5
    //                         }
    //                         styleDefault = new Style({

    //                             image: new CircleStyle({
    //                                 radius: radius,

    //                                 stroke: new Stroke({
    //                                     color: '#fff',
    //                                     width: 2
    //                                 }),
    //                                 fill: new Fill({
    //                                     color: environment.primaryColor,
    //                                 })
    //                             }),
    //                             //   text: new Text({
    //                             //     text: size.toString(),
    //                             //     fill: new Fill({
    //                             //       color: '#fff'
    //                             //     }),
    //                             //     font: '12px sans-serif',
    //                             //     offsetY: 1,
    //                             //     offsetX: -0.5
    //                             //   })
    //                         });
    //                         styleCache[size] = styleDefault;
    //                     }

    //                     return [couche.style, styleDefault];

    //                 } else if (size == 1) {
    //                     return new Style({
    //                         image: new Icon({
    //                             scale: couche.size,
    //                             src: couche.icon
    //                         })
    //                     })

    //                 } else if (size == 0) {
    //                     return
    //                 }

    //             },
    //             /**
    //             * so that map.forEachLayerAtPixel work as expected
    //             * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
    //             */
    //             className: couche.nom + '___' + couche.type_layer
    //         });

    //     }


    // }

    // else if (couche.type == 'wfs') {
    //     var source = new VectorSource({
    //         format: new GeoJSON({ dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }),
    //         loader: (extent, resolution, projection) => {
    //             var extent_vieuw = CartoHelper.getMapExtent(map) as any
    //             var url = couche.url +
    //                 '?bbox=' + transformExtent(extent_vieuw, 'EPSG:3857', 'EPSG:4326').join(',') +
    //                 '&SERVICE=WFS&VERSION=1.1.0&REQUEST=GETFEATURE&outputFormat=GeoJSON&typeName=' + couche.identifiant.join(',');
    //             this.BackendApiService.getRequestFromOtherHostObserver(url)
    //                 .pipe(
    //                     /** retry 3 times after 2s if querry failed  */
    //                     retryWhen(errors =>
    //                         errors.pipe(
    //                             tap((val: HttpErrorResponse) => {
    //                                 // console.log(val)
    //                             }),
    //                             delayWhen((val: HttpErrorResponse) => timer(2000)),
    //                             // delay(2000),
    //                             take(3)
    //                         )
    //                     )
    //                 )
    //                 .subscribe(
    //                     (data) => {
    //                         let features: any = source.getFormat().readFeatures(data)

    //                         source.addFeatures(features);
    //                         for (let index = 0; index < source.getFeatures().length; index++) {
    //                             const feature = source.getFeatures()[index];
    //                             feature.set('featureId', feature.getId())
    //                         }
    //                     },
    //                     (err: HttpErrorResponse) => {
    //                         source.removeLoadedExtent(extent_vieuw);
    //                     }
    //                 )

    //         }
    //     });

    //     // layer = 
    //     new VectorLayer({
    //         source: source,
    //         style: new Style({
    //             image: new Icon({
    //                 scale: couche.size,
    //                 src: couche.icon
    //             })
    //         }),
    //         /**
    //       * so that map.forEachLayerAtPixel work as expected
    //       * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
    //       */
    //         className: couche.nom + '___' + couche.type_layer
    //     });

    //     if (couche.cluster) {
    //         var clusterSource = new Cluster({
    //             distance: 80,
    //             source: source
    //         });
    //         var styleCache = {};
    //         var styleCacheCopy = {}
    //         // layer =
    //         new VectorLayer({
    //             source: clusterSource,
    //             style: (feature) => {
    //                 var size = feature.get('features').length;

    //                 if (size > 1) {

    //                     var styleDefault = styleCache[size];
    //                     if (!styleDefault) {
    //                         var radius = 10
    //                         if (size > 99) {
    //                             radius = 12, 5
    //                         }
    //                         styleDefault = new Style({

    //                             image: new CircleStyle({
    //                                 radius: radius,

    //                                 stroke: new Stroke({
    //                                     color: '#fff',
    //                                     width: 2
    //                                 }),
    //                                 fill: new Fill({
    //                                     color: environment.primaryColor,
    //                                 })
    //                             }),
    //                             //   text: new Text({
    //                             //     text: size.toString(),
    //                             //     fill: new Fill({
    //                             //       color: '#fff'
    //                             //     }),
    //                             //     font: '12px sans-serif',
    //                             //     offsetY: 1,
    //                             //     offsetX: -0.5
    //                             //   })
    //                         });
    //                         styleCache[size] = styleDefault;
    //                     }

    //                     return [new Style({
    //                         image: new Icon({
    //                             scale: couche.size,
    //                             src: couche.icon
    //                         })
    //                     }), styleDefault];

    //                 } else if (size == 1) {
    //                     return new Style({
    //                         image: new Icon({
    //                             scale: couche.size,
    //                             src: couche.icon
    //                         })
    //                     })

    //                 } else if (size == 0) {
    //                     return
    //                 }

    //             },
    //             /**
    //         * so that map.forEachLayerAtPixel work as expected
    //         * @see https://openlayers.org/en/latest/apidoc/module-ol_PluggableMap-PluggableMap.html#forEachLayerAtPixel
    //         */
    //             className: couche.nom + '___' + couche.type_layer
    //         });

    //     }


    // }



    // if (couche.zindex) {
    // }

    // if (couche.minzoom && layer instanceof TileLayer == false) {
    //   layer.setMinResolution(map.getView().getResolutionForZoom(couche.minzoom))
    // }

    // if (couche.maxzoom) {
    //   layer.setMaxResolution(map.getView().getResolutionForZoom(couche.maxzoom))
    // }
    layer.visible = couche.visible

    return layer

}