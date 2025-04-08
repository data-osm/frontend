import { AlwaysDepth, AlwaysStencilFunc, Box3, BoxGeometry, BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, GreaterDepth, Group, InstancedBufferGeometry, InstancedMesh, LessDepth, LinearFilter, LinearMipmapLinearFilter, Material, Matrix4, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshStandardMaterial, NoBlending, Object3D, PerspectiveCamera, PlaneGeometry, Points, Quaternion, RepeatWrapping, ReplaceStencilOp, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, Vector3 } from "three";
import { delay, filter, materialize, retryWhen, map as rxjsMap, take, tap } from "rxjs/operators"
import { Instance, Map as Giro3DMap, OLUtils, OrbitControls } from "../giro-3d-module";
import { Feature, GeometryLayout, MVT, Polygon, TileState, VectorTileSource, GeoJSON, Point } from "../ol-module";
import { fromInstanceGiroEvent } from "../shared/class/fromGiroEvent";
import { createXYZ } from "ol/tilegrid";
import { CartoHelper, getAllFeaturesInVectorTileSource, getFeaturesFromTileCoord } from "../../helper/carto.helper";
import { Projection } from "ol/proj";
import { BehaviorSubject, ReplaySubject } from "rxjs";
import { TileCoord } from "ol/tilecoord";
import { BufferGeometryUtils, GLTF } from "three/examples/jsm/Addons";
import Earcut from 'earcut';
import Flatbush from 'flatbush';
import { FillStyle, StrokeStyle } from "@giro3d/giro3d/core/FeatureTypes";
import { FeaturesStoreService } from "../data/store/features.store.service";
import { AppInjector } from "../../helper/app-injector.helper";
import { environment } from "../../environments/environment";
import VectorRenderTile from "ol/VectorRenderTile";
import { getBottomLeft } from "ol/extent";



class ThreeTile extends Group {
    readonly isFeatureTile = true;
    readonly type = 'ThreeTile';
    key: string

    userData: {

    };

    threes_loaded: Array<number[]> = []

}

/**
 * Default height in meters of a three
 */
export const THREE_HEIGHT = 3

/**
 * THE width/height of a building tile 30 KM
 */
const THREE_TILE_SIZE = 30000
const tempVec2 = new Vector2()
const tempVec3 = new Vector3()
const tempVec3_second = new Vector3()
const tempMatrix4 = new Matrix4()
const tempQuaternion = new Quaternion()

export class TreeLayer {
    instance: Instance
    map: Giro3DMap
    controls: OrbitControls

    _tileSets: Map<string, ThreeTile> = new Map()
    threeGroup: Group = new Group()

    threeGeometry: BufferGeometry
    threeMaterial: Material

    constructor(
        map: Giro3DMap,
        threeGlb: GLTF
    ) {

        this.map = map
        this.instance = map["_instance"]
        this.controls = this.instance.view.controls as OrbitControls
        this.threeGroup.matrixAutoUpdate = false
        this.instance.add(this.threeGroup)

        this.threeGroup.renderOrder = 3

        const textureLoader = new TextureLoader()

        const tree_volume_normal = textureLoader.load("assets/models/tree/tree_volume_normal.png")
        // const beech_diffuse = textureLoader.load("assets/models/tree/beech_diffuse.png")
        // const beech_normal = textureLoader.load("assets/models/tree/beech_normal.png")
        // const fir_diffuse = textureLoader.load("assets/models/tree/fir_diffuse.png")
        // const fir_normal = textureLoader.load("assets/models/tree/fir_normal.png")
        // const linden0_diffuse = textureLoader.load("assets/models/tree/linden0_diffuse.png")
        // const linden0_normal = textureLoader.load("assets/models/tree/linden0_normal.png")
        const linden1_diffuse = textureLoader.load("assets/models/tree/linden1_diffuse.png")
        const linden1_normal = textureLoader.load("assets/models/tree/linden1_normal.png")
        // const oak_diffuse = textureLoader.load("assets/models/tree/oak_diffuse.png")
        // const oak_normal = textureLoader.load("assets/models/tree/oak_normal.png")

        linden1_diffuse.magFilter = LinearFilter
        linden1_diffuse.minFilter = LinearMipmapLinearFilter
        linden1_diffuse.colorSpace = SRGBColorSpace
        linden1_diffuse.wrapS = RepeatWrapping
        linden1_diffuse.wrapT = RepeatWrapping

        linden1_normal.minFilter = LinearMipmapLinearFilter
        linden1_normal.magFilter = LinearFilter
        linden1_normal.colorSpace = SRGBColorSpace
        linden1_normal.wrapS = RepeatWrapping
        linden1_normal.wrapT = RepeatWrapping

        // linden1_diffuse.repeat.x = 2
        // linden1_diffuse.repeat.y = 3

        // const model = (threeGlb.scene.children[0].children[0] as Mesh);
        this.threeGeometry = (threeGlb.scene.children[0].clone() as Mesh).geometry
        // BufferGeometryUtils.mergeGeometries(
        //     [
        //         (threeGlb.scene.children[0].children[0] as Mesh),
        //         (threeGlb.scene.children[0].children[1].children[0] as Mesh),

        //     ].map((child) => {
        //         let geometry = child.geometry.clone()
        //         return geometry
        //     })
        // )
        this.threeMaterial = new MeshStandardMaterial({
            map: linden1_diffuse,
            transparent: true,
            normalMap: linden1_normal,
            normalScale: tempVec2.set(999999, 999999),
            alphaTest: 0.5
            // blending: NoBlending
            // color: 0xee82ee
        })
        // this.threeMaterial = ((threeGlb.scene.children[0] as Mesh).material as Material)

    }

    getThreeTile(coordinate: Vector2) {
        // const tilePosition = new Vector2(Math.ceil(coordinate.x / THREE_TILE_SIZE) * THREE_TILE_SIZE,
        //     Math.ceil(coordinate.y / THREE_TILE_SIZE) * THREE_TILE_SIZE)
        const tilePosition = coordinate
        const tile_key = tilePosition.x + "_" + tilePosition.y
        if (this._tileSets.has(tile_key)) {
            return this._tileSets.get(tile_key)
        }

        const newBuildingTile = new ThreeTile()
        newBuildingTile.key = tile_key
        newBuildingTile.position.set(
            tilePosition.x, tilePosition.y, 0
        )
        newBuildingTile.updateMatrixWorld()
        newBuildingTile.updateMatrix()

        this.threeGroup.add(newBuildingTile)

        this._tileSets.set(tile_key, newBuildingTile)
        return newBuildingTile
    }

    currentZoomChanged(zoom: number) {
        if (zoom < 16) {
            this.threeGroup.visible = false
        } else {
            this.threeGroup.visible = true
        }
    }
    extentLoadEnd(vectorTileSource: VectorTileSource, tilesToLoad: VectorRenderTile[]) {
        for (let index = 0; index < tilesToLoad.length; index++) {
            const tile = tilesToLoad[index];
            const features = getFeaturesFromTileCoord(tile, 16).filter((feat) => feat.getProperties()["layer"] == "point" && feat.getProperties()["type"] == "tree") as Feature[]

            if (features.length > 0) {
                const buildingTileCenter = getBottomLeft(vectorTileSource.tileGrid.getTileCoordExtent(tile.getTileCoord()))
                const x = buildingTileCenter[0]
                const y = buildingTileCenter[1]
                const threeTile = this.getThreeTile(new Vector2(x, y))
                this.processFeatures(features, threeTile)
            }
        }
    }

    processFeatures(features: Feature[], threeTile: ThreeTile) {
        if (features.length == 0) {
            return
        }
        // console.log(features.length, "threeGlb - features.length")
        // const firstTileFeature = (features[0].getGeometry() as Point).getFlatCoordinates()

        // const threeTile = this.getThreeTile(
        //     tempVec2.set(firstTileFeature[0], firstTileFeature[1])
        // )
        if (threeTile.threes_loaded.length > 0) {
            threeTile.threes_loaded = threeTile.threes_loaded.concat(features.map((feature) => (feature.getGeometry() as Point).getFlatCoordinates()))
            threeTile.clear()
        } else {
            threeTile.threes_loaded = features.map((feature) => (feature.getGeometry() as Point).getFlatCoordinates())
        }

        const instancedThreeMesh = new InstancedMesh(this.threeGeometry, this.threeMaterial, threeTile.threes_loaded.length);
        // const instancedThreeMesh = new InstancedMesh(new Points().geometry, new Material(), threeTile.threes_loaded.length);
        instancedThreeMesh.updateMatrix()
        threeTile.add(instancedThreeMesh)
        threeTile.updateMatrixWorld()



        for (let index = 0; index < threeTile.threes_loaded.length; index++) {
            // const feature = features[index];
            // const geometry = feature.getGeometry() as Point
            const coordinate = threeTile.threes_loaded[index];
            // const properties = feature.getProperties()
            // let height = <number>properties.height ?? null;

            tempVec3.set(
                coordinate[0] - threeTile.position.x,
                coordinate[1] - threeTile.position.y,
                15
            )
            const scale = new Vector3(15, 15, 15);

            tempQuaternion.setFromAxisAngle(tempVec3_second.set(1, 0, 0), (Math.PI / -2))

            tempMatrix4.compose(tempVec3, tempQuaternion, scale);
            instancedThreeMesh.setMatrixAt(index, tempMatrix4);


        }



        // console.log(all_coordinates, features.length * 3)
        // const geometry = new BufferGeometry()
        // geometry.setAttribute("position", new BufferAttribute(all_coordinates, 3))
        // const threeMesh = new Points(geometry)
        // threeMesh.updateMatrix()
        // threeTile.add(threeMesh)
        // threeTile.updateMatrixWorld()

    }

}