import { Group, MathUtils, Mesh, Object3D, Object3DEventMap, PerspectiveCamera, Raycaster, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget } from "three";
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls, tile, PickObjectsAtOptions, Coordinates, ColorLayer, Target, LayeredMaterial, LayerUserData, LayerEvents, Layer, Extent } from "../giro-3d-module";
import Feature from "ol/Feature";
import { FeaturesStoreService } from "../data/store/features.store.service";
import { AppInjector } from "../../helper/app-injector.helper";
import { CartoHelper } from "../../helper/carto.helper";
import { LayerGiroUserData } from "../../helper/type";
import { getUid } from "ol";
import WMTSCapabilities from "ol/format/WMTSCapabilities";
import { TileGrid } from "ol/tilegrid";
import WMTS, { optionsFromCapabilities } from "ol/source/WMTS";
import { transformExtent, transform } from "ol/proj";

import Vec2 from "./math/vector2";
/**
 * interface that describe data get by a click on the map
 */
export interface dataFromClickOnMapInterface {
    type: 'vector' | 'raster' | 'clear',
    data: {
        coord: [number, number],
        point: Vector3
        layers: Array<Layer<LayerEvents, LayerGiroUserData>> | undefined,
        feature?: Feature
        object?: Object3D<Object3DEventMap>
        descriptionSheetCapabilities: string
        //** mandatory when type is raster, will be use to generate wms get feature info url */
        /** additional data */
        data?: {}
    }
}

const tmpVec2 = new Vector2()
const tmpVec3 = new Vector3()

export class MapMousseEvents {

    featuresStoreService: FeaturesStoreService = AppInjector.get(FeaturesStoreService);


    private instance: Instance
    private map: Giro3DMap
    private controls: OrbitControls
    private camera: PerspectiveCamera

    constructor(
        map: Giro3DMap,
    ) {
        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls
        this.camera = this.instance.view.camera as PerspectiveCamera

    }

    /**
    *Mousse click On map
    *@param evt MapBrowserEvent
    *@param (param :dataFromClickOnMapInterface)=>void
    */
    onClicked(evt: MouseEvent): dataFromClickOnMapInterface[] {
        const cartoHelper = new CartoHelper(this.map)
        const pickOptions: PickObjectsAtOptions =
        {
            limit: Infinity,
            radius: 0,
            sortByDistance: true,
            gpuPicking: false
        };
        let data_callback: dataFromClickOnMapInterface[] = []



        // const normalized = this.instance.canvasToNormalizedCoords(this.instance.eventToCanvasCoords(evt, new Vector2()), new Vector2());
        // const mapCoord = new Vector3(normalized.x, normalized.y, 0).unproject(this.camera);
        // const result = this.map.getElevation({
        //     coordinates: new Coordinates(this.map.extent.crs, mapCoord.x, mapCoord.y)
        // })
        // let pointElevation: number = undefined
        // if (result.samples.length > 0) {
        //     // Let's sort the samples to get the highest resolution sample first
        //     result.samples.sort((a, b) => a.resolution - b.resolution);

        //     pointElevation = result.samples[0].elevation;
        //     // console.log(elevation, "map elevation")
        // }
        // if (pointElevation !== undefined) {
        //     // mapCoord.setZ(pointElevation)
        //     const newMapCoord = new Vector3(normalized.x, normalized.y, pointElevation).unproject(this.camera);
        //     const direction = newMapCoord.sub(this.instance.view.camera.position).normalize();
        //     const raycaster = new Raycaster(this.instance.view.camera.position, direction);
        //     pickOptions.raycaster = raycaster
        //     console.log(newMapCoord, pointElevation, "newMapCoord")
        // }
        // const where = this.instance.getObjects()
        // this.instance.scene.traverseVisible((object) => {
        //     if (object instanceof Object3D && where.findIndex((o) => o.id === object.id) == -1) {
        //         where.push(object)
        //     }
        // })
        // pickOptions.where = where
        const map_pick_result = this.instance.pickObjectsAt(evt, pickOptions)
        if (map_pick_result.length == 0) {
            return
        }

        const mousePositionInMap: Vector3 = map_pick_result[0].point
        // this.featuresStoreService.getBuildingHeightAtPoint(new Vec2(mousePositionInMap.x, mousePositionInMap.y)).then((height) => {
        //     console.log(height, "building height")
        // })
        // console.log(map_pick_result, "map_pick_result")
        // @ts-expect-error
        if (map_pick_result.filter((res) => res.featureUid).length > 0) {
            // We remove duplicate
            const intersects = Array.from(
                new Map(
                    map_pick_result
                        // @ts-expect-error
                        .filter(res => res.featureUid)
                        // @ts-expect-error
                        .map(res => [res.featureUid, res])
                ).values()
            );
            for (let i = 0; i < intersects.length; i++) {
                const intersect = intersects[i]
                const couche_id = intersect.object.userData.couche_id
                //@ts-expect-error
                const feature = this.featuresStoreService.getFeatureFromLayer(couche_id, intersect.featureUid)

                // const layers_vector_sources_map = this.featuresStoreService.getLayerVectorSource(couche_id)
                // //@ts-expect-error
                // const feature = layers_vector_sources_map.getFeatureByUid(intersect.featureUid)
                const layer = cartoHelper.getLayerInToc(couche_id, "couche")
                let descriptionSheetCapabilities = undefined
                if (layer) {
                    descriptionSheetCapabilities = layer.descriptionSheetCapabilities
                } else {
                    descriptionSheetCapabilities = intersect.object.userData.descriptionSheetCapabilities as string
                }

                data_callback.push(
                    {
                        type: 'vector',
                        data: {
                            coord: [mousePositionInMap.x, mousePositionInMap.y],
                            layers: layer?.layer,
                            point: intersect.point,
                            object: intersect.object,
                            descriptionSheetCapabilities: descriptionSheetCapabilities,
                            feature: feature,
                            data: {}
                        }
                    }
                )
            }


        }

        if (data_callback.length > 0) {
            return data_callback
        } else if (map_pick_result.length > 0) {
            let layers_clicked: Array<Layer<LayerEvents, LayerGiroUserData>> = []
            for (let index = 0; index < this.map.getLayers().length; index++) {
                const layer = this.map.getLayers()[index] as Layer<LayerEvents, LayerGiroUserData>;
                // We do not handle onClick on VectorSource layer
                // VectorSource are only used as labels in the app
                if (layer.source.type == "VectorSource") {
                    continue
                }
                // Only layer whose have description Sheet capability are handle
                if (layer.userData.descriptionSheetCapabilities == undefined) {
                    continue
                }

                let targets = Array.from(layer["_targets"].values()) as Array<Target>
                const target = targets.find((t: Target) => t.node.uuid == map_pick_result[0].object.uuid)

                if (!target) {
                    continue
                }

                // if (target.renderTarget instanceof WebGLRenderTarget == false) {
                //     continue
                // }

                // only visible layer
                if (!layer.visible) {
                    continue
                }

                const material = target.node.material as LayeredMaterial
                // @ts-expect-error
                material.getColorTexture(layer)

                // @ts-expect-error
                const layerTextureInfo = material._texturesInfo.color.infos[this.map.getIndex(layer)]

                // @ts-expect-error
                let uv = target.extent.offsetInExtent(map_pick_result[0].coord, tmpVec2);
                // let i, j
                // if (layerTextureInfo) {
                //     const transformed = layerTextureInfo.offsetScale.transform(uv)
                //     const uu = MathUtils.clamp(transformed.x, 0, 1);
                //     const vv = MathUtils.clamp(transformed.y, 0, 1);

                //     i = MathUtils.clamp(Math.round(uu * target.width - 1), 0, target.width);
                //     j = MathUtils.clamp(Math.round(vv * target.height - 1), 0, target.height);
                // }

                const renderer = layer["_composer"].composer["_renderer"] as WebGLRenderer


                let pixels = new Uint8Array(10 * 10 * 4);
                renderer.readRenderTargetPixels(
                    target.renderTarget.object,
                    target.width * uv.x, target.height * uv.y, 10, 10, pixels
                );

                // console.log(target.width * uv.x, target.height * uv.y)
                // console.log(layer.name, distance_between_mousse_cursor_and_target_left_corner_x / target_resolution, distance_between_mousse_cursor_and_target_left_corner_y / target_resolution, pixels.reduce((sum, number) => sum + number) > 0)

                if (pixels.reduce((sum, number) => sum + number) > 0) {
                    layers_clicked.push(layer)
                }
            }

            if (layers_clicked.length > 0) {
                for (let index = 0; index < layers_clicked.length; index++) {
                    const layer = layers_clicked[index];
                    const descriptionSheetCapabilities = layers_clicked[index].userData.descriptionSheetCapabilities
                    data_callback.push({
                        type: 'raster',
                        data: {
                            // @ts-expect-error
                            coord: [map_pick_result[0].coord.toVector2().x, map_pick_result[0].coord.toVector2().y],
                            point: map_pick_result[0].point,
                            layers: layers_clicked,
                            descriptionSheetCapabilities: descriptionSheetCapabilities
                        }
                    })
                }

                return data_callback
            }
        } else {
            // const data_callback: dataFromClickOnMapInterface = {
            //     type: 'clear',
            //     data: {
            //         coord: [mousePositionInMap.x, mousePositionInMap.y],
            //         point: map_pick_result[0].point,
            //         layers: [],
            //         descriptionSheetCapabilities: undefined
            //     }
            // }
            // data_callback
        }

        // const results = instance.pickObjectsAt(evt, pickOptions);

        // var pixel = this.map.getEventPixel(evt.originalEvent);

        //   var feature = this.map.forEachFeatureAtPixel(pixel,
        //     function (feature, layer) {
        //       return feature;
        //     }, {
        //     hitTolerance: 5
        //   });

        //   var layer = this.map.forEachFeatureAtPixel(pixel,
        //     function (feature, layer) {
        //       if (layer instanceof VectorLayer) {
        //         return layer;
        //       }

        //     }, {
        //     hitTolerance: 5
        //   });

        //   let layers: Array<Layer> = []

        //   if (!feature) {
        //     var all_pixels = new manageDataHelper().calcHitMatrix(evt.pixel)
        //     for (let index = 0; index < all_pixels.length; index++) {
        //       var un_pixel = all_pixels[index];
        //       var nom_layers_load = []

        //       for (let i = 0; i < layers.length; i++) {
        //         nom_layers_load.push(layers[i].userData.nom);
        //       }

        //       var layers_in_pixels = this.displayFeatureInfo(un_pixel, 'nom', nom_layers_load)

        //       for (let j = 0; j < layers_in_pixels.length; j++) {
        //         layers.push(layers_in_pixels[j]);
        //       }

        //     }
        //   }

        //   if (layer instanceof VectorLayer && feature) {
        //     /**
        //      * if the user click on a cluser, and the cluster have more than one feature, we zoom in; but if ther is only one feature, we return the feature
        //      *
        //     */

        //     if (layer.getSource() instanceof Cluster) {
        //       var numberOfFeatureInCluster = this.countFeaturesInCluster(feature.get('features'));
        //       // console.log(layer,feature,numberOfFeatureInCluster)
        //       if (numberOfFeatureInCluster > 1) {
        //         if (Object.create(feature.getGeometry()).getType() == 'Point') {
        //           var coordinate = Object.create(feature.getGeometry()).getCoordinates();
        //           var geom = new Point(coordinate)
        //           this.fit_view(geom, this.map.getView().getZoom() + 2)
        //         }
        //       } else if (numberOfFeatureInCluster == 1) {
        //         var feat = this.getFeatureThatIsDisplayInCulster(feature.getProperties().features)
        //         var coord = this.map.getCoordinateFromPixel(pixel)
        // var data_callback: dataFromClickOnMapInterface = {
        //   type: 'vector',
        //   data: {
        //     coord: coord,
        //     layers: [layer as any],
        //     feature: feat,
        //     data: {}
        //   }
        // }

        //         callback(data_callback)
        //       }

        //     }

        //     // var coord = this.map.getCoordinateFromPixel(pixel)
        //     // var data_callback: dataFromClickOnMapInterface = {
        //     //   'type': 'clear_elem_geo_surbrillance',
        //     //   data: {
        //     //     coord: coord,
        //     //     layers: layers
        //     //   }
        //     // }
        //     // callback(data_callback)

        //   } else if (layers.length > 0) {
        //     var coord = this.map.getCoordinateFromPixel(pixel)
        // var data_callback: dataFromClickOnMapInterface = {
        //   type: 'raster',
        //   data: {
        //     coord: coord,
        //     layers: layers
        //   }
        // }
        // callback(data_callback)

        //   } else {
        //     var coord = this.map.getCoordinateFromPixel(pixel)
        //     var data_callback: dataFromClickOnMapInterface = {
        //       'type': 'clear',
        //       data: {
        //         coord: coord,
        //         layers: layers
        //       }
        //     }
        //     callback(data_callback)
        //   }
    }

}