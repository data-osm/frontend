import Feature, { FeatureLike } from "ol/Feature";
import { BufferGeometryUtils } from "three/examples/jsm/Addons";
import { Box3, BufferAttribute, BufferGeometry, DataArrayTexture, Mesh, ShaderMaterial, Sphere, Texture, Vector2, Vector3 } from "three";
import { Builder, createBuildingPolygons } from "./building/builder";
import { SkeletonBuilder } from "straight-skeleton";
import { Coordinate, GeometryLayout, Polygon } from "../ol-module";
import { getUid } from "ol";


export const build3dBuildings = (features: { "properties": {}, "flatCoordinates": Array<number>, "ends_": number[], "feature_id": number }[], worldBuildingPosition: Vector3, tile_key: string) => {


    const olFeatures = features.map((feature) => {
        // console.log(feature)

        const flatCoordinates: Array<number> = feature.flatCoordinates

        // buildingTile.updateWorldMatrix()

        const newFlatCoordinates = flatCoordinates.slice().map((coord, index) => {
            // pair => x
            if (index % 2 == 0) {
                return coord - worldBuildingPosition.x
            }
            return coord - worldBuildingPosition.y
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



        const polygon = new Polygon(newFlatCoordinates, 'XY', feature.ends_)
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

        const buildFeature = []
        const featuresId = []

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

        const buildingGeometries = buildFeature.map((building, index) => {

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

        const geometriesJson = Object.keys(buildingGeometry.attributes).map((key) => {

            return {
                "key": key,
                "data": buildingGeometry.attributes[key].toJSON()
            }
        })
        return {
            // "buildingGeometries": buildingGeometries,
            "tile_key": tile_key,
            "geometriesJson": geometriesJson
        }

    }

    return undefined

}