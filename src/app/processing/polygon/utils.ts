import { M } from "@angular/cdk/keycodes";
import { MultiPolygon, Polygon, Coordinate, Feature } from "../../ol-module";
import { createListElevationWorker, ElevationFeature, GeometryType, getCapabilities, ListElevationMessageMap, ListElevationsMessageType } from "../elevation/pool";
import { WorkerPool } from "../../giro-3d-module";
import { MultiPolygonWithZ, PolygonWithZ } from "../utils";

let elevationWorker: WorkerPool<ListElevationsMessageType, ListElevationMessageMap> | null = null

export async function addElevationToPolygons(features: Array<Feature<Polygon | MultiPolygon>>): Promise<(Feature<PolygonWithZ | MultiPolygonWithZ>)[]> {


    const featureForElevation: ElevationFeature[] = features.map((feature, index) => {
        const properties = feature.getProperties()
        delete properties["geometry"]
        return {
            "properties": properties,
            "geometryType": feature.getGeometry().getType() as GeometryType,
            "coordinates": feature.getGeometry().getCoordinates(),
            "index": index
        }
    })


    if (elevationWorker == undefined) {
        elevationWorker = new WorkerPool({ createWorker: createListElevationWorker });
    }
    return getCapabilities().then(async (capabilities) => {

        const responseGeometries: Array<Feature<PolygonWithZ | MultiPolygonWithZ>> = []
        const result = await elevationWorker.queue('ListElevation', { "capabilities": capabilities, "features": featureForElevation });

        result.map((featureWithElevation) => {
            const feature = features[featureWithElevation.index]
            const geometry = feature.getGeometry()
            if (geometry instanceof Polygon) {
                // @ts-expect-error
                const geometryWithZ = new PolygonWithZ(geometry.getCoordinates(), geometry.getLayout(), geometry.getEnds(), featureWithElevation.coordinates)
                feature.setGeometry(geometryWithZ)
            } else if (geometry instanceof MultiPolygon) {
                // @ts-expect-error
                const geometryWithZ = new MultiPolygonWithZ(geometry.getCoordinates(), geometry.getLayout(), geometry.getEnds(), featureWithElevation.coordinates)
                feature.setGeometry(geometryWithZ)
            }
        })

        // const elevations: Map<number | string, number> = result.elevations
        // if (transformCoordinates.length != Array.from(elevations.values()).length) {
        //     console.warn(
        //         "Toutes élévations n'ont pas été trouvées pour les polygones",
        //     )
        // }
        // for (let index = 0; index < geometries.length; index++) {
        //     const geometry = geometries[index]
        //     if (geometry instanceof Polygon) {
        //         const coordinatesWithZ: Array<Array<[number, number, number]>> = []
        //         geometry.getCoordinates().map((ring_coordinates, ring_index) => {
        //             const ring_coordinatesWithZ: Array<[number, number, number]> = []
        //             ring_coordinates.map((coordinate, coordinate_index) => {
        //                 const elevation = elevations.get(index + "_" + ring_index + "_" + coordinate_index)
        //                 if (elevation == undefined || elevation == -Infinity) {
        //                     console.warn('Elevation de d un polygone non trouvée')
        //                 }
        //                 ring_coordinatesWithZ.push([coordinate[0], coordinate[1], elevation])
        //             })
        //             coordinatesWithZ.push(ring_coordinatesWithZ)
        //         })
        //         const geometryWithZ = new PolygonWithZ(geometry.getCoordinates(), geometry.getLayout(), geometry.getEnds(), coordinatesWithZ)
        //         responseGeometries.push(geometryWithZ)
        //     } else if (geometry instanceof MultiPolygon) {
        //         const coordinatesWithZ: Array<Array<Array<[number, number, number]>>> = []

        //         const coordinates = geometry.getCoordinates()
        //         coordinates.map((ring_coordinates, ring_index) => {
        //             const ring_coordinatesWithZ: Array<Array<[number, number, number]>> = []
        //             ring_coordinates.map((second_ring_coordinate, second_ring_index) => {
        //                 const second_ring_coordinateWithZ: Array<[number, number, number]> = []
        //                 second_ring_coordinate.map((coordinate, coordinate_index) => {
        //                     const elevation = elevations.get(index + "_" + ring_index + "_" + second_ring_index + "_" + coordinate_index)
        //                     if (elevation == undefined || elevation == -Infinity) {
        //                         console.warn('Elevation de d un polygone non trouvée')
        //                     }
        //                     second_ring_coordinateWithZ.push([coordinate[0], coordinate[1], elevation])
        //                 })
        //                 ring_coordinatesWithZ.push(second_ring_coordinateWithZ)
        //             })
        //             coordinatesWithZ.push(ring_coordinatesWithZ)
        //         })
        //         const geometryWithZ = new MultiPolygonWithZ(geometry.getCoordinates(), geometry.getLayout(), geometry.getEndss(), coordinatesWithZ)
        //         responseGeometries.push(geometryWithZ)

        //     }
        // }
        return features as Feature<PolygonWithZ | MultiPolygonWithZ>[]
    })

}

