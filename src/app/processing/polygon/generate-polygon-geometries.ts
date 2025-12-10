import { Box3, BufferGeometry, BufferAttribute } from "three"
import { formatPolygonFeatures, flipTriangleWindingNonIndexed } from "../build3dBuilding"
import { Tile3DProjectedGeometry, Tile3DInstance, Tile3DTerrainMaskGeometry, Tile3DProjectedGeometryBuilder } from "./tile3d-projected-geometry-builder"
import { ExtrudedTile } from "../building-processing-worker/worker-packer"
import { Tile3DFeaturesToBuffersConverter } from "../building/tile3d-features-to-buffers-converter"
import { ProjectedTextures, SourceFeature, SurfaceBuilderOrientation, SurfaceVectorArea, SurfaceVectorAreaDescriptor, TreeType, VectorArea, VectorAreaDescriptor, ZIndexMap } from "../building/type"
import { inputRingToVectorRing, inputRingToVectorRing3D, validateRing, VectorAreaRingType } from "../building/builder"
import { MultiPolygon, Polygon } from "ol/geom"
import Tile3DRing, { Tile3DRingType, Tile3DRingWith3D, VectorAreaRing } from "../building/tile-3d-ring"
import { Feature } from "ol"
import Tile3DMultipolygon from "../building/tile3d-multipolygon"
import Vec2 from "../math/vector2"
import Vec3 from "../math/vector3"
import SeededRandom from "../building/building-builder"

import { getTreeType, getTreeHeightRangeFromTextureId, getTreeTextureIdFromType, getTreeTextureScaling } from "../points/type"
import { Coordinate } from "ol/coordinate"
import { MultiPolygonWithZ, PolygonWithZ } from "../utils"
import * as Simplify from "simplify-js";

const tmpBox3 = new Box3()
const mercatorScale: number = 1.52122668;

function formatPolygonFeaturesWithZ(features: SourceFeature[], worldBuildingPosition: [number, number, number]) {
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

        const coordinatesWithZ: Array<Array<[number, number, number]>> | Array<Array<Array<[number, number, number]>>> = feature.coordinates
        if (feature.geometryType == "MultiPolygon") {
            (coordinatesWithZ as Array<Array<Array<[number, number, number]>>>).map((p) => {
                p.map((coordinates) => {
                    coordinates.map((coord, index) => {
                        // pair => x
                        // if (index % 2 == 0) {
                        coord[0] -= worldBuildingPosition[0]
                        // }
                        coord[1] -= worldBuildingPosition[1]
                    })
                })
            })
        } else {
            // console.log(coordinatesWithZ)
            (coordinatesWithZ as Array<Array<[number, number, number]>>).map((coordinates) => {
                coordinates.map((coord, index) => {
                    // pair => x
                    // if (index % 2 == 0) {
                    coord[0] -= worldBuildingPosition[0]
                    // }
                    coord[1] -= worldBuildingPosition[1]
                })
            })
        }


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

        let polygon: PolygonWithZ | MultiPolygonWithZ
        if (feature.geometryType == "MultiPolygon") {
            //@ts-expect-error
            polygon = new MultiPolygonWithZ(newFlatCoordinates, 'XY', feature.ends)
        } else {
            //@ts-expect-error
            polygon = new PolygonWithZ(newFlatCoordinates, 'XY', feature.ends)
        }

        if (feature.geometryType == "MultiPolygon") {

            let newOuterAndInnerCoordinates = (polygon as MultiPolygonWithZ).getPolygons().map((poly, poly_index) => {
                return poly.getLinearRings().map((ring, index) => {
                    let outerRing = ring.getCoordinates();
                    if (index == 0) {
                        if (signedArea(outerRing) > 0) {
                            return coordinatesWithZ[poly_index][index].reverse()
                        }
                        return coordinatesWithZ[poly_index][index]
                    } else {
                        if (signedArea(outerRing) > 0) {
                            return coordinatesWithZ[poly_index][index]
                        }
                        return coordinatesWithZ[poly_index][index].reverse()
                    }
                })

            }) as Array<Array<Array<[number, number, number]>>>
            polygon.coordinatesWithZ = newOuterAndInnerCoordinates
        } else {
            let newOuterAndInnerCoordinates = (polygon as PolygonWithZ).getLinearRings().map((ring, index) => {
                let outerRing = ring.getCoordinates();
                if (index == 0) {
                    if (signedArea(outerRing) > 0) {
                        return coordinatesWithZ[index].reverse()
                    }
                    return coordinatesWithZ[index]
                } else {
                    if (signedArea(outerRing) > 0) {
                        return coordinatesWithZ[index]
                    }
                    return coordinatesWithZ[index].reverse()
                }
            }) as Array<Array<[number, number, number]>>
            polygon.coordinatesWithZ = newOuterAndInnerCoordinates
        }

        const olFeature = new Feature(polygon)
        olFeature.setProperties(feature.properties)
        return olFeature
    })

    return olFeatures
}


export function generateSurfaceGeometries(renderFeatures: SourceFeature[], worldBuildingPosition: [number, number, number], segment: number, tileSize: number): ExtrudedTile {
    const features = formatPolygonFeaturesWithZ(renderFeatures, worldBuildingPosition)

    if (features.length == 0) {
        return undefined
    }




    const surfaceVectorAreas = createSurfaceVectorArea(features)
    let projectedFeatures: Tile3DProjectedGeometry[] = []
    let instanceFeatures: Tile3DInstance[] = []

    for (let index = 0; index < surfaceVectorAreas.length; index++) {
        const element = surfaceVectorAreas[index];


        const projectedGeometry = new PolygonBuilder(element, segment, tileSize).getFeatures();

        projectedGeometry.map((geom) => {
            if (geom.type === "projected") {
                projectedFeatures.push(geom)
            } else if (geom.type == "instance") {
                instanceFeatures.push(geom)
            }

        })
    }

    if (projectedFeatures.length == 0) {
        return undefined
    }


    // if (this.feature.osmReference == 4014810) {
    //     return []
    // }

    let projectedGeometries = Tile3DFeaturesToBuffersConverter.getProjectedBuffers(projectedFeatures)
    let instanceGeometries = Tile3DFeaturesToBuffersConverter.getInstanceBuffers(instanceFeatures)

    const projectedGeometry = new BufferGeometry();
    projectedGeometry.setAttribute("position", new BufferAttribute((projectedGeometries.positionBuffer as Float32Array), 3))
    projectedGeometry.setAttribute("normal", new BufferAttribute((projectedGeometries.normalBuffer as Float32Array), 3))
    projectedGeometry.setAttribute("uv", new BufferAttribute((projectedGeometries.uvBuffer as Float32Array), 2))
    projectedGeometry.setAttribute("textureId", new BufferAttribute((projectedGeometries.textureIdBuffer as Uint8Array), 1))
    projectedGeometry.setAttribute("zIndex", new BufferAttribute((projectedGeometries.zIndexBuffers as Uint8Array), 1))
    projectedGeometry.computeVertexNormals()
    flipTriangleWindingNonIndexed(projectedGeometry)

    // const projectedGeometry = BufferGeometryUtils.mergeGeometries(projectedGeometries)
    tmpBox3.setFromArray(projectedGeometry.attributes.position.array)

    const geometriesJson = Object.keys(projectedGeometry.attributes).map((key) => {

        return {
            "key": key,
            "data": projectedGeometry.attributes[key].toJSON()
        }
    })
    // console.log(projectedGeometries, projectedFeatures, "projectedGeometries")

    if ((projectedGeometries.positionBuffer as Float32Array).length == 0) {
        return undefined
    }
    // if (tile_key == "33193_22544") {
    //     console.log(projectedGeometries, surfaceVectorAreas, tile_key, [tmpBox3.min.x, tmpBox3.min.y, tmpBox3.min.z, tmpBox3.max.x, tmpBox3.max.y, tmpBox3.max.z])
    // }
    return {
        "boundingBoxMinMax": [tmpBox3.min.x, tmpBox3.min.y, tmpBox3.min.z, tmpBox3.max.x, tmpBox3.max.y, tmpBox3.max.z],
        worldBuildingPosition: worldBuildingPosition,
        "geometriesJson": geometriesJson
    }
}

export function createSurfaceVectorArea(olFeatures: Feature<PolygonWithZ | MultiPolygonWithZ>[]): VectorArea[] {
    const areas: VectorArea[] = [];

    for (let index = 0; index < olFeatures.length; index++) {
        const olFeature = olFeatures[index];
        const rings: VectorAreaRing[] = [];

        const properties = olFeature.getProperties() as SurfaceVectorAreaDescriptor;
        const geometry = olFeature.getGeometry()

        if (geometry instanceof MultiPolygonWithZ) {
            geometry.coordinatesWithZ.forEach((polygon, polygon_i) => {
                polygon.forEach((coordinates, ring_i) => {
                    let i = 0;

                    if (!validateRing(coordinates.map((r) => [r[0], r[1]]))) {
                        i++
                        throw new Error('Invalid PBF ring');
                    }
                    let type = VectorAreaRingType.Inner;
                    if (i == 0) {
                        type = VectorAreaRingType.Outer;
                    }

                    const vectorRing = inputRingToVectorRing3D(coordinates, type);
                    rings.push(vectorRing);
                    i++
                })
            })

        } else {
            geometry.coordinatesWithZ.forEach((coordinates, ring_i) => {
                let i = 0;
                if (!validateRing(coordinates.map((r) => [r[0], r[1]]))) {
                    i++
                    throw new Error('Invalid PBF ring');
                }
                let type = VectorAreaRingType.Inner;
                if (i == 0) {
                    type = VectorAreaRingType.Outer;
                }
                const vectorRing = inputRingToVectorRing3D(coordinates, type);
                rings.push(vectorRing);
                i++
            })

        }

        for (const ring of rings) {
            if (ring.type === VectorAreaRingType.Outer) {

                areas.push({
                    type: "area",
                    rings: [ring],
                    osmReference: olFeature.getProperties()["osm_id"],
                    descriptor: getSurfaceAreaParams(properties),
                    elevation: 0
                });
            } else {

                if (!areas[areas.length - 1]) {
                    throw new Error('Invalid ring order');
                }

                areas[areas.length - 1].rings.push(ring);
            }
        }
    }


    return areas

}

function getSurfaceAreaParams(properties: SurfaceVectorAreaDescriptor): VectorAreaDescriptor {

    function getPitchTypeFromOSMTags(tags): 'soccer' | 'generic' | 'football' | 'basketball' | 'tennis' {
        function getTagValues(props, key) {
            if (Boolean(props[key])) {
                return props[key].toString().split(';').map((part) => part.trim())
            }
            return [];
        }
        const values = getTagValues(tags, 'sport')

        const lookup = ['generic', 'football', 'basketball', 'tennis', 'soccer']

        for (const value of values) {

            if (value === 'basketball' && getTagValues(tags, 'hoops')[0] == '1') {
                return 'generic';
            }

            if (lookup.includes(value)) {
                return value
            }
        }

        return 'generic';
    }

    function getSurfaceAreaType(tags) {

        if (tags.type == "playground" || tags.type == "dog_park") {
            return "pitch"
        }

        if (
            tags.type === 'parking' || tags.type === 'bicycleParking'
        ) {
            return 'asphalt'
        }
        if (
            tags.type === 'swimmingPool'
        ) {
            return 'water'
        }

        if (tags.type == "park") {
            // return "grass"
        }

        return tags.type
    }






    return {
        type: getSurfaceAreaType(properties),
        // osm_id: properties.osm_id,
        // osm_type: properties.osm_type,
        pitchType: getPitchTypeFromOSMTags(properties),
        surface: properties.surface,
        treeType: getTreeType(properties),
        label: properties.name
    }

}


export class PolygonBuilder {
    multipolygon: Tile3DMultipolygon
    tilePosition: [number, number, number]
    rings: Array<VectorAreaRing>
    feature: SurfaceVectorArea
    segment: number
    tileSize: number

    constructor(
        feature: VectorArea,
        segment: number, tileSize: number
    ) {
        this.segment = segment
        this.tileSize = tileSize
        this.rings = feature.rings;
        this.feature = feature
        this.simplify()
    }

    private simplify(): void {
        if (this.feature.descriptor.type === 'roadwayIntersection' || this.feature.descriptor.type === 'building') {
            return;
        }

        const multipolygon = this.getMultipolygon();
        const initialArea = multipolygon.getArea();

        if (initialArea < 5) {
            return;
        }

        for (const ring of this.rings) {

            // @ts-expect-error
            ring.nodes = Simplify(ring.nodes, 0.5, false);
        }

        this.multipolygon = null;
    }

    getMultipolygon(): Tile3DMultipolygon {
        if (this.multipolygon == undefined) {
            this.multipolygon = new Tile3DMultipolygon(this.feature.osmReference);

            for (const ring of this.rings) {
                const type = ring.type === VectorAreaRingType.Inner ? Tile3DRingType.Inner : Tile3DRingType.Outer;

                const nodes = ring.nodes.map(node => {

                    return new Vec3(node.x, node.y, node.z)
                });

                this.multipolygon.addRing3D(new Tile3DRingWith3D(type, nodes));
            }
            // if (this.descriptor.ombb) {
            //     const newOmbb = this.descriptor.ombb.map((corner) => {
            //         const newCorner = Vec2.clone(corner)
            //         newCorner.x -= this.tilePosition.x
            //         newCorner.y -= this.tilePosition.y
            //         return newCorner
            //     })
            //     this.multipolygon.setOMBB(newOmbb as OMBBResult);
            // }

        }

        return this.multipolygon;
    }

    getFeatures(): (Tile3DTerrainMaskGeometry | Tile3DProjectedGeometry | Tile3DInstance)[] {
        // textureId: ProjectedTextures.Water,
        //     isOriented: false,
        //         
        // console.log(this.feature.descriptor.type)
        // return this.handleGenericSurface({
        //     zIndex: ZIndexMap.Pitch,
        //     isOriented: false,
        //     textureId: ProjectedTextures.Grass,
        //     uvScale: 25,
        //     stretch: false
        // })

        // 'scrub' | 'water' | 'track'  
        // if (this.feature.osmReference == 377924430) {
        //     console.log(this.feature.descriptor, 377924430)
        // }

        // if (this.feature.osmReference == 25532413) {
        //     console.log(this.feature.descriptor, 25532413)
        // }
        // if (this.feature.descriptor.type == "pitch") {
        //     const textureIdMap = {
        //         football: ProjectedTextures.FootballPitch,
        //         soccer: ProjectedTextures.FootballPitch,
        //         basketball: ProjectedTextures.BasketballPitch,
        //         tennis: ProjectedTextures.TennisCourt,
        //         generic: ProjectedTextures.Grass
        //     };

        //     const textureId = textureIdMap[this.feature.descriptor.pitchType];

        //     if (textureId === ProjectedTextures.Grass) {
        //         return this.handleGenericSurface({
        //             textureId,
        //             isOriented: false,
        //             uvScale: 20,
        //             zIndex: ZIndexMap.Pitch
        //         });
        //     }
        //     return this.handleGenericSurface({
        //         textureId,
        //         isOriented: true,
        //         stretch: true,
        //         zIndex: ZIndexMap.Pitch
        //     });
        // }
        // return []

        switch (this.feature.descriptor.type) {
            case 'water': {
                return this.handleGenericSurface({
                    textureId: ProjectedTextures.Water,
                    isOriented: true,
                    // stretch: true,
                    uvScale: 25,
                    zIndex: ZIndexMap.Water,
                });
            }
            case 'park': {
                return this.handleGenericSurface({
                    textureId: ProjectedTextures.GenericPitch,
                    isOriented: false,
                    uvScale: 20,
                    zIndex: ZIndexMap.Park,
                });
            }
            case 'pitch':
                const textureIdMap = {
                    football: ProjectedTextures.FootballPitch,
                    soccer: ProjectedTextures.FootballPitch,
                    basketball: ProjectedTextures.BasketballPitch,
                    tennis: ProjectedTextures.TennisCourt,
                    generic: ProjectedTextures.Grass
                };

                const textureId = textureIdMap[this.feature.descriptor.pitchType];

                if (textureId === ProjectedTextures.Grass) {
                    return this.handleGenericSurface({
                        textureId,
                        isOriented: false,
                        uvScale: 20,
                        zIndex: ZIndexMap.Pitch
                    });
                }
                return this.handleGenericSurface({
                    textureId,
                    isOriented: true,
                    stretch: true,
                    zIndex: ZIndexMap.Pitch
                });
            case 'garden': {
                return this.handleGenericSurface({
                    textureId: ProjectedTextures.Garden,
                    isOriented: false,
                    zIndex: ZIndexMap.Garden,
                    uvScale: 16,
                });
            }
            case 'grass': {

                const textureIdMap = {
                    football: ProjectedTextures.FootballPitch,
                    soccer: ProjectedTextures.FootballPitch,
                    basketball: ProjectedTextures.BasketballPitch,
                    tennis: ProjectedTextures.TennisCourt,
                    generic: ProjectedTextures.Grass
                };
                const textureId = textureIdMap[this.feature.descriptor.pitchType];

                if (textureId === ProjectedTextures.Grass) {
                    return this.handleGenericSurface({
                        textureId: ProjectedTextures.Grass,
                        isOriented: false,
                        zIndex: ZIndexMap.Grass,
                        uvScale: 25,
                    });
                }

                return this.handleGenericSurface({
                    textureId,
                    isOriented: true,
                    stretch: true,
                    zIndex: ZIndexMap.Pitch
                });
            }
            case 'asphalt': {
                return this.handleGenericSurface({
                    textureId: ProjectedTextures.Asphalt,
                    isOriented: false,
                    zIndex: ZIndexMap.AsphaltArea,
                    uvScale: 20,
                    addUsageMask: false,
                });
            }
            // case 'forest': {
            //     // const t0 = performance.now();
            //     // // console.log("humm")
            //     // if (this.feature.osmReference == -1875897) {
            //     //     console.log("c'est la foret")
            //     // }
            //     const points2D = this.getMultipolygon().populateWithPoints();
            //     // console.log("okok")
            //     // if (this.feature.osmReference == -1875897) {
            //     //     const t1 = performance.now();
            //     //     console.log(`Temps écoulé : ${(t1 - t0).toFixed(2)} ms`);
            //     // }
            //     const points3D: Vec3[] = [];
            //     const positions: number[] = [];

            //     for (const point of points2D) {
            //         if (point.x < 0 || point.y < 0) {
            //             continue;
            //         }

            //         positions.push(point.x, point.y);
            //         points3D.push(new Vec3(point.x, point.y, 0));
            //     }
            //     const trees: Tile3DInstance[] = []
            //     for (let i = 0; i < points3D.length; i++) {
            //         const x = points3D[i].x;
            //         const y = points3D[i].y;
            //         const z = points3D[i].z;

            //         trees.push(this.createTree(x, y, z));
            //     }

            //     return trees

            // }
            case 'roadwayIntersection': {
                return this.handleRoadIntersection();
            }

        }
        switch (this.feature.descriptor.surface) {
            case 'asphalt': {
                return this.handleGenericSurface({
                    textureId: ProjectedTextures.Asphalt,
                    isOriented: false,
                    zIndex: ZIndexMap.AsphaltArea,
                    uvScale: 20,
                    addUsageMask: false,
                });
            }
            case 'concrete': {
                return this.handleGenericSurface({
                    textureId: ProjectedTextures.ConcreteIntersection,
                    isOriented: false,
                    zIndex: ZIndexMap.ConcreteArea,
                    uvScale: 20,
                    addUsageMask: false,
                });
            }
        }
        return [];
    }

    private handleGenericSurface(
        {
            textureId,
            isOriented,
            uvScale = 1,
            stretch = false,
            orientation = SurfaceBuilderOrientation.Along,
            zIndex,
            addUsageMask = false
        }: {
            textureId: number;
            isOriented: boolean;
            uvScale?: number;
            stretch?: boolean;
            orientation?: SurfaceBuilderOrientation;
            zIndex: number;
            addUsageMask?: boolean;
        }
    ) {
        const builder = new Tile3DProjectedGeometryBuilder(this.segment, this.tileSize, this.getMultipolygon());
        builder.setZIndex(zIndex);

        builder.addPolygon({
            height: 0,
            textureId: textureId,
            isOriented: isOriented,
            orientation: orientation,
            stretch: stretch,
            uvScale: uvScale,
            addUsageMask: addUsageMask
        });

        const features: Array<Tile3DTerrainMaskGeometry | Tile3DProjectedGeometry> = [builder.getGeometry()];

        if (addUsageMask) {

            features.push(builder.getTerrainMaskGeometry());
        }
        return features;
    }

    private handleRoadIntersection() {
        const params: Record<
            VectorAreaDescriptor['intersectionMaterial'],
            { textureId: number; scale: number }
        > = {
            asphalt: { textureId: ProjectedTextures.Asphalt, scale: 20 },
            concrete: { textureId: ProjectedTextures.ConcreteIntersection, scale: 20 },
            cobblestone: { textureId: ProjectedTextures.Cobblestone, scale: 6 },
        };

        const { textureId, scale } = params[this.feature.descriptor.intersectionMaterial] ?? params.asphalt;

        return this.handleGenericSurface({
            textureId: textureId,
            isOriented: false,
            zIndex: ZIndexMap.AsphaltArea,
            uvScale: scale,
            addUsageMask: true
        });
    }

    private createTree(x: number, y: number, z: number): Tile3DInstance {
        const seed = Math.floor(x) + Math.floor(y);
        const rnd = new SeededRandom(seed);

        const rotation = rnd.generate() * Math.PI * 2;

        const textureIdList = getTreeTextureIdFromType(this.feature.descriptor.treeType);
        const textureId = textureIdList[Math.floor(rnd.generate() * textureIdList.length)];
        const textureScale = getTreeTextureScaling(textureId);

        const heightRange = getTreeHeightRangeFromTextureId(textureId);
        const height = heightRange[0] + rnd.generate() * (heightRange[1] - heightRange[0]);

        return {
            type: 'instance',
            instanceType: 'tree',
            x: x,
            y: y,
            z: z * mercatorScale,
            scale: height * textureScale * mercatorScale,
            rotation: rotation,
            seed: rnd.generate(),
            textureId: textureId
        };
    }


}