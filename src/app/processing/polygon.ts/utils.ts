import { M } from "@angular/cdk/keycodes";
import { MultiPolygonWithZ, PolygonWithZ } from "../../../helper/carto.helper";
import { MultiPolygon, Polygon, Coordinate, Feature } from "../../ol-module";
import WorkerPool from "@giro3d/giro3d/utils/WorkerPool";
import { createListElevationWorker, getCapabilities, ListElevationMessageMap, ListElevationsMessageType } from "../elevation/pool";

let elevationWorker: WorkerPool<ListElevationsMessageType, ListElevationMessageMap> | null = null

export async function addElevationToPolygons(geometries: Array<Polygon | MultiPolygon>, featureCrs: string): Promise<(PolygonWithZ | MultiPolygonWithZ)[]> {
    const transformCoordinates: [number, number, number | string][] = []

    geometries.map((init_geometry, index) => {
        const geometry = init_geometry.clone().transform(featureCrs, "IGNF:WGS84G")
        if (geometry instanceof Polygon) {
            const coordinates = geometry.getCoordinates()

            coordinates.map((ring_coordinates, ring_index) => {
                ring_coordinates.map((coordinate, coordinate_index) => {
                    transformCoordinates.push([coordinate[0], coordinate[1], index + "_" + ring_index + "_" + coordinate_index])
                })
            })
        } else if (geometry instanceof MultiPolygon) {
            const coordinates = geometry.getCoordinates()
            coordinates.map((ring_coordinates, ring_index) => {
                ring_coordinates.map((second_ring_coordinate, second_ring_index) => {
                    second_ring_coordinate.map((coordinate, coordinate_index) => {
                        transformCoordinates.push([coordinate[0], coordinate[1], index + "_" + ring_index + "_" + second_ring_index + "_" + coordinate_index])
                    })
                })
            })

        }
    })


    if (elevationWorker == undefined) {
        elevationWorker = new WorkerPool({ createWorker: createListElevationWorker });
    }
    return getCapabilities().then(async (capabilities) => {

        const responseGeometries: Array<PolygonWithZ | MultiPolygonWithZ> = []
        const result = await elevationWorker.queue('ListElevation', { "capabilities": capabilities, "coordinates_with_index": transformCoordinates });
        const elevations: Map<number | string, number> = result.elevations
        if (transformCoordinates.length != Array.from(elevations.values()).length) {
            console.warn(
                "Toutes élévations n'ont pas été trouvées pour les polygones",
            )
        }
        for (let index = 0; index < geometries.length; index++) {
            const geometry = geometries[index]
            if (geometry instanceof Polygon) {
                const coordinatesWithZ: Array<Array<[number, number, number]>> = []
                geometry.getCoordinates().map((ring_coordinates, ring_index) => {
                    const ring_coordinatesWithZ: Array<[number, number, number]> = []
                    ring_coordinates.map((coordinate, coordinate_index) => {
                        const elevation = elevations.get(index + "_" + ring_index + "_" + coordinate_index)
                        if (elevation == undefined || elevation == -Infinity) {
                            console.warn('Elevation de d un polygone non trouvée')
                        }
                        ring_coordinatesWithZ.push([coordinate[0], coordinate[1], elevation])
                    })
                    coordinatesWithZ.push(ring_coordinatesWithZ)
                })
                const geometryWithZ = new PolygonWithZ(geometry.getCoordinates(), geometry.getLayout(), geometry.getEnds(), coordinatesWithZ)
                responseGeometries.push(geometryWithZ)
            } else if (geometry instanceof MultiPolygon) {
                const coordinatesWithZ: Array<Array<Array<[number, number, number]>>> = []

                const coordinates = geometry.getCoordinates()
                coordinates.map((ring_coordinates, ring_index) => {
                    const ring_coordinatesWithZ: Array<Array<[number, number, number]>> = []
                    ring_coordinates.map((second_ring_coordinate, second_ring_index) => {
                        const second_ring_coordinateWithZ: Array<[number, number, number]> = []
                        second_ring_coordinate.map((coordinate, coordinate_index) => {
                            const elevation = elevations.get(index + "_" + ring_index + "_" + second_ring_index + "_" + coordinate_index)
                            if (elevation == undefined || elevation == -Infinity) {
                                console.warn('Elevation de d un polygone non trouvée')
                            }
                            second_ring_coordinateWithZ.push([coordinate[0], coordinate[1], elevation])
                        })
                        ring_coordinatesWithZ.push(second_ring_coordinateWithZ)
                    })
                    coordinatesWithZ.push(ring_coordinatesWithZ)
                })
                const geometryWithZ = new MultiPolygonWithZ(geometry.getCoordinates(), geometry.getLayout(), geometry.getEndss(), coordinatesWithZ)
                responseGeometries.push(geometryWithZ)

            }
        }
        return responseGeometries
    })

}


