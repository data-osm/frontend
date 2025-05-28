import { Group, MathUtils, Mesh, Object3D, Object3DEventMap, PerspectiveCamera, Raycaster, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget } from "three";
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls, tile, PickObjectsAtOptions, Coordinates, ColorLayer, Target, LayeredMaterial, LayerUserData, LayerEvents, Layer, Extent } from "../giro-3d-module";
import Feature from "ol/Feature";
import { FeaturesStoreService } from "../data/store/features.store.service";
import { AppInjector } from "../../helper/app-injector.helper";
import { CartoHelper } from "../../helper/carto.helper";
import { LayerGiroUserData } from "../../helper/type";
import { getUid } from "ol";

/**
 * interface that describe data get by a click on the map
 */
export interface dataFromClickOnMapInterface {
    type: 'vector' | 'raster' | 'clear',
    data: {
        coord: [number, number],
        point: Vector3
        layers: Array<Layer<LayerEvents, LayerGiroUserData>>,
        feature?: Feature
        object?: Object3D<Object3DEventMap>
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
    onClicked(evt: MouseEvent): dataFromClickOnMapInterface {
        const cartoHelper = new CartoHelper(this.map)
        const pickOptions: PickObjectsAtOptions =
        {
            limit: Infinity,
            radius: 0,
            sortByDistance: true,
            gpuPicking: false
        };
        let data_callback: dataFromClickOnMapInterface
        const map_pick_result = this.instance.pickObjectsAt(evt, pickOptions)
        if (map_pick_result.length == 0) {
            return
        }
        // const map_pick_result: Array<any> = this.instance.pickObjectsAt(evt, pickOptions)
        const mousePositionInMap: Vector3 = map_pick_result[0].point

        // @ts-expect-error
        if (map_pick_result.filter((res) => res.featureUid).length > 0) {
            // @ts-expect-error
            const intersects = map_pick_result.filter((res) => res.featureUid)

            const intersect = intersects[intersects.length - 1]
            const couche_id = intersect.object.userData.couche_id
            const layers_vector_sources_map = this.featuresStoreService.getLayerVectorSource(couche_id)
            // @ts-expect-error
            const feature = layers_vector_sources_map.getFeatureByUid(intersect.featureUid)
            const layer = cartoHelper.getLayerInToc(couche_id, "couche")
            data_callback = {
                type: 'vector',
                data: {
                    coord: [mousePositionInMap.x, mousePositionInMap.y],
                    layers: layer.layer,
                    point: intersect.point,
                    object: intersect.object,
                    feature: feature,
                    data: {}
                }
            }
        }


        // eventToCanvasCoords
        // const mousePositionInMap = tmpVec3.fromArray(
        //     this.instance.eventToNormalizedCoords(evt, tmpVec2).toArray().concat([0]),
        // ).unproject(this.camera)

        // const layers_vector_sources_map = this.featuresStoreService.layersVectorSourcesMap()
        // if (layers_vector_sources_map.size > 0) {
        //     // const layers_visible_in_map = []

        //     layers_vector_sources_map.forEach((vector_source, couche_id) => {
        //         const layer = cartoHelper.getLayerInToc(couche_id, "couche")
        //         if (layer && layer.visible) {
        //             let ex = Extent.fromCenterAndSize('EPSG:3857', { x: mousePositionInMap.x, y: mousePositionInMap.y }, 150, 150)
        //             const olExtent = OLUtils.toOLExtent(ex);
        //             const focalLength = this.instance.view.camera.position.distanceTo(this.instance["_controls"].target);
        //             const fov = this.camera.fov * (Math.PI / 180);
        //             const aspect = this.camera.aspect;
        //             const heightNear = 2 * Math.tan(fov / 2) * focalLength;
        //             const mapWith = heightNear * aspect;
        //             let targetResolution = mapWith / this.instance.domElement.width
        //             // Resolution of 3 => 50 M
        //             let maxDistance = 50
        //             if (targetResolution < 3) {
        //                 maxDistance = (targetResolution * 50) / 3
        //             }
        //             if (maxDistance < 20) {
        //                 maxDistance = 20
        //             }
        //             // vector_source.getFeatureByUid()
        //             const feature = vector_source.getClosestFeatureToCoordinateLimitByDistance([mousePositionInMap.x, mousePositionInMap.y], maxDistance)
        //             if (feature) {
        //                 data_callback = {
        //                     type: 'vector',
        //                     data: {
        //                         coord: [mousePositionInMap.x, mousePositionInMap.y],
        //                         layers: layer.layer,
        //                         point: intersects.length > 0 ? intersects[0].point : mousePositionInMap,
        //                         feature: feature,
        //                         data: {}
        //                     }
        //                 }
        //                 return
        //             }
        //         }
        //     })

        // }

        if (data_callback) {
            return data_callback
        } else if (map_pick_result.length > 0) {
            // const buildings = map_pick_result.filter((res) => res.object.type == "Mesh")
            // buildings.map((b) => (b.object as Mesh).geometry.index.count / 3)
            // console.log(map_pick_result, "mapHasClicked")
            let layers_clicked = []
            for (let index = 0; index < this.map.getLayers().length; index++) {
                const layer = this.map.getLayers()[index] as ColorLayer;
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
                if (target.renderTarget instanceof WebGLRenderTarget == false) {
                    continue
                }
                // only visible layer
                if (!layer.visible) {
                    continue
                }

                const material = target.node.material as LayeredMaterial
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
                    target["renderTarget"],
                    target.width * uv.x, target.height * uv.y, 10, 10, pixels
                );

                // console.log(target.width * uv.x, target.height * uv.y)
                // console.log(layer.name, distance_between_mousse_cursor_and_target_left_corner_x / target_resolution, distance_between_mousse_cursor_and_target_left_corner_y / target_resolution, pixels.reduce((sum, number) => sum + number) > 0)

                if (pixels.reduce((sum, number) => sum + number) > 0) {
                    layers_clicked.push(layer)
                }
            }

            if (layers_clicked.length > 0) {

                const data_callback: dataFromClickOnMapInterface = {
                    type: 'raster',
                    data: {
                        // @ts-expect-error
                        coord: [map_pick_result[0].coord.toVector2().x, map_pick_result[0].coord.toVector2().y],
                        point: map_pick_result[0].point,
                        layers: layers_clicked,
                    }
                }
                return data_callback
            }
        } else {
            const data_callback: dataFromClickOnMapInterface = {
                type: 'clear',
                data: {
                    coord: [mousePositionInMap.x, mousePositionInMap.y],
                    point: map_pick_result[0].point,
                    layers: []
                }
            }
            data_callback
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