import Feature, { FeatureLike } from "ol/Feature";
import { BufferGeometryUtils } from "three/examples/jsm/Addons";
import { Box3, BufferAttribute, BufferAttributeJSON, BufferGeometry, DataArrayTexture, Mesh, ShaderMaterial, Sphere, Texture, Vector2, Vector3 } from "three";
import { Builder, createBuildingPolygons } from "./building/builder";
import { SkeletonBuilder } from "straight-skeleton";
import { Coordinate, GeometryLayout, Polygon } from "../ol-module";
import { getUid } from "ol";
import { SourceFeature } from "./building/type";
import { ExtrudedTile } from "./building-processing-worker/worker-packer";

const tmpBox3 = new Box3()

function flipTriangleWindingNonIndexed(geometry) {
    const positionAttr = geometry.attributes.position;
    const uvAttr = geometry.attributes.uv;

    if (!positionAttr) {
        console.warn('No position attribute found.');
        return;
    }

    const posArray = positionAttr.array;
    const uvArray = uvAttr ? uvAttr.array : null;

    for (let i = 0; i < posArray.length; i += 9) {
        // Swap vertex 0 and vertex 2 for positions
        for (let j = 0; j < 3; j++) {
            const temp = posArray[i + j];
            posArray[i + j] = posArray[i + 6 + j];
            posArray[i + 6 + j] = temp;
        }
    }

    if (uvArray) {
        for (let i = 0; i < uvArray.length; i += 6) {
            // Each triangle has 3 UV points (2 floats per point)
            // Swap UV0 and UV2
            for (let j = 0; j < 2; j++) {
                const temp = uvArray[i + j];
                uvArray[i + j] = uvArray[i + 4 + j];
                uvArray[i + 4 + j] = temp;
            }
        }
        uvAttr.needsUpdate = true;
    }

    positionAttr.needsUpdate = true;
}

export const build3dBuildings = (features: SourceFeature[], worldBuildingPosition: [number, number, number], tile_key: string): ExtrudedTile => {


    let olFeatures = features.map((feature) => {
        // console.log(feature)

        const flatCoordinates: Array<number> = feature.flatCoordinates

        // buildingTile.updateWorldMatrix()

        const newFlatCoordinates = flatCoordinates.slice().map((coord, index) => {
            // pair => x
            if (index % 2 == 0) {
                return coord - worldBuildingPosition[0]
            }
            return coord - worldBuildingPosition[1]
        })
        // console.log(newFlatCoordinates)

        function signedArea(coordinates) {
            let area = 0;
            const len = coordinates.length;
            for (let i = 0; i < len; i++) {
                const [x1, y1] = coordinates[i];
                const [x2, y2] = coordinates[(i + 1) % len];
                area += (x2 - x1) * (y2 + y1);
            }
            return area;
        }

        function ensureClockwise(coordinates) {
            if (signedArea(coordinates) > 0) {
                // If the polygon is counterclockwise, reverse the coordinates
                return coordinates.reverse();
            }
            return coordinates; // Already clockwise
        }
        function ensureCounterClockwise(coordinates) {
            if (signedArea(coordinates) > 0) {
                // If the polygon is clockwise, reverse the coordinates
                return coordinates;
            }
            return coordinates.reverse();
        }


        // @ts-ignore
        const polygon = new Polygon(newFlatCoordinates, 'XY', feature.ends)
        const newOuterAndInnerCoordinates = polygon.getLinearRings().map((ring, index) => {
            let outerRing = ring.getCoordinates();
            if (index == 0) {
                outerRing = ensureClockwise(outerRing);
            } else {
                outerRing = ensureCounterClockwise(outerRing);
            }
            return outerRing
        })
        polygon.setCoordinates(newOuterAndInnerCoordinates)
        const olFeature = new Feature(polygon)
        olFeature.setProperties(feature.properties)
        return olFeature
    })


    if (olFeatures.length > 0) {


        const vectors_areas = createBuildingPolygons(olFeatures)

        let buildFeature = []
        let featuresId = []

        for (let index = 0; index < vectors_areas.length; index++) {
            const element = vectors_areas[index];


            featuresId.push(element.osmReference)
            const buildingGeometry = new Builder(element, worldBuildingPosition).getFeatures();

            const positions = (buildingGeometry.extruded.positionBuffer as Float32Array)
            for (let i = 2; i < positions.length; i += 3) {
                positions[i] += element.elevation;
            }
            buildFeature.push(buildingGeometry)
        }

        let buildingGeometries = buildFeature.map((building, index) => {

            const extrudedBuilding = building.extruded
            const buildingGeometry = new BufferGeometry();

            const colorBuffer = Float32Array.from(extrudedBuilding.colorBuffer)
            const addOutLine = Int32Array.from({ length: (extrudedBuilding.positionBuffer as Float32Array).length / 3 }, () => {
                if (Boolean(vectors_areas[index].descriptor.rnb) == false && Boolean(vectors_areas[index].descriptor.match_rnb_ids)) {
                    return 1
                }
                return 0
            })

            buildingGeometry.setAttribute("position", new BufferAttribute((extrudedBuilding.positionBuffer as Float32Array), 3))
            buildingGeometry.setAttribute("color", new BufferAttribute(colorBuffer.slice().map((v) => { return v / 255 }), 3))
            buildingGeometry.setAttribute("normal", new BufferAttribute((extrudedBuilding.normalBuffer as Float32Array), 3))
            buildingGeometry.setAttribute("textureId", new BufferAttribute((extrudedBuilding.textureIdBuffer as Uint8Array), 1))
            buildingGeometry.setAttribute("uv", new BufferAttribute((extrudedBuilding.uvBuffer as Float32Array), 2))
            buildingGeometry.setAttribute("aFeatureUid", new BufferAttribute(Int32Array.from({ length: buildingGeometry.getAttribute("position").count }, () => featuresId[index]), 1));
            buildingGeometry.setAttribute("aAddOutLine", new BufferAttribute(addOutLine, 1));
            return buildingGeometry
        })


        const buildingGeometry = BufferGeometryUtils.mergeGeometries(buildingGeometries)

        // clean up memory
        featuresId = null
        buildFeature = null
        buildingGeometries = null
        olFeatures = null

        tmpBox3.setFromArray(buildingGeometry.attributes.position.array)
        tmpBox3.min

        flipTriangleWindingNonIndexed(buildingGeometry)
        buildingGeometry.computeVertexNormals()

        const geometriesJson = Object.keys(buildingGeometry.attributes).map((key) => {

            return {
                "key": key,
                "data": buildingGeometry.attributes[key].toJSON()
            }
        })

        return {
            "boundingBoxMinMax": [tmpBox3.min.x, tmpBox3.min.y, tmpBox3.min.z, tmpBox3.max.x, tmpBox3.max.y, tmpBox3.max.z],
            worldBuildingPosition: worldBuildingPosition,
            "tile_key": tile_key,
            "geometriesJson": geometriesJson
        }

    }

    return undefined

}