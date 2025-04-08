import { Vector3 } from "three";
import { LineString, MultiLineString, LinearRing, Coordinate } from "../../ol-module";
import { getLength } from 'ol/sphere';
const tmpVec3 = new Vector3()


export function createPositionBuffer(coordinates: Coordinate[], options: {
    ignoreZ: boolean,
    origin: Vector3
}): Float32Array {
    const bufferSize = 3 * coordinates.length;
    const result = new Float32Array(bufferSize);

    const origin = tmpVec3;
    const ignoreZ = options.ignoreZ;

    if (options.origin) {
        origin.copy(options.origin);
    } else {
        origin.set(0, 0, 0);
    }

    for (let i = 0; i < coordinates.length; i++) {
        const p = coordinates[i];

        const i0 = i * 3;

        const x = p[0];
        const y = p[1];
        const z = ignoreZ ? 0 : p[2] ?? 0;

        result[i0 + 0] = x - origin.x;
        result[i0 + 1] = y - origin.y;
        result[i0 + 2] = z - origin.z;
    }

    return result;
}

export function isLineStringClosed(lineString: LineString | MultiLineString | LinearRing) {
    const coordinates = lineString.getCoordinates();
    if (coordinates.length < 2) {
        return false; // A valid line must have at least 2 points
    }
    const firstCoord = coordinates[0];
    const lastCoord = coordinates[coordinates.length - 1];

    // Check if the first and last coordinates are the same
    return firstCoord[0] === lastCoord[0] && firstCoord[1] === lastCoord[1];
}

export function ensureLineStringNotClosed(lineString: LineString | LinearRing) {
    const coordinates = lineString.getCoordinates();
    // if (!isLineStringClosed(lineString)) {
    if ((lineString.getFlatCoordinates().length / 2) % 2 != 0) {
        // Remove the last coordinate if it is the same as the first one
        coordinates.push(coordinates[coordinates.length - 1])
        // coordinates.pop()
        lineString.setCoordinates(coordinates);
    }
    // console.log((lineString.getFlatCoordinates().length / 2) % 2 == 0, "multiple of 2")
}

export function ensureMultiLineStringNotClosed(multiLineString: MultiLineString) {
    const coordinates = multiLineString.getCoordinates();

    // Iterate over each LineString's coordinates and ensure it is not closed
    const updatedCoordinates = coordinates.map((lineCoords) => {
        if (lineCoords.length > 1 &&
            lineCoords[0][0] === lineCoords[lineCoords.length - 1][0] &&
            lineCoords[0][1] === lineCoords[lineCoords.length - 1][1]) {
            // Remove the last coordinate if it matches the first
            lineCoords.pop();
        }
        return lineCoords;
    });

    // Update the MultiLineString's coordinates
    multiLineString.setCoordinates(updatedCoordinates);
}
export function subdivideMultiLineString(multiLineString: MultiLineString, maxLength: number) {
    const new_multi_line_string = new MultiLineString([])

    multiLineString.getLineStrings().map((lines_string) => {
        new_multi_line_string.appendLineString(subdivideLineString(lines_string, maxLength))
    })
    return new_multi_line_string
}
export function subdivideLineString(lineString: LineString, maxLength: number) {
    const coordinates = lineString.getCoordinates();
    const newCoordinates = [];

    for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];
        newCoordinates.push(start);

        // Calculate the distance between start and end points (in meters)
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Determine how many segments we need to add
        if (distance > maxLength) {
            const numSegments = Math.ceil(distance / maxLength);
            // const segmentLength = distance / numSegments;

            // Calculate intermediate points and add them to newCoordinates
            for (let j = 1; j < numSegments; j++) {
                const factor = j / numSegments;
                const newX = start[0] + factor * dx;
                const newY = start[1] + factor * dy;
                newCoordinates.push([newX, newY]);
            }
        }
    }

    // Add the last point of the original lineString
    newCoordinates.push(coordinates[coordinates.length - 1]);

    // Create a new LineString with the subdivided coordinates
    return new LineString(newCoordinates);
}


/**
 * Function to divide an OpenLayers LineString into segments of approximately 4 meters.
 * @param {LineString} lineString - The original OpenLayers LineString geometry.
 * @param {number} segmentLength - The length of each segment in meters (default: 4 meters).
 * @returns {LineString} - A new LineString geometry with interpolated points at approximately 4-meter intervals.
 */
export function divideLineStringByLength(lineString: LineString, segmentLength = 4) {
    const coordinates = lineString.getCoordinates();
    const newCoordinates = [];
    let accumulatedLength = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];
        const segment = new LineString([start, end]);
        const length = getLength(segment);

        if (accumulatedLength + length < segmentLength) {
            newCoordinates.push(start);
            accumulatedLength += length;
        } else {
            let remainingLength = segmentLength - accumulatedLength;
            let distanceCovered = 0;

            while (distanceCovered + remainingLength <= length) {
                const interpolationFactor = remainingLength / length;
                const interpolatedCoordinate = interpolateCoordinates(start, end, interpolationFactor);
                newCoordinates.push(interpolatedCoordinate);

                // Start a new segment
                distanceCovered += remainingLength;
                remainingLength = segmentLength;
            }

            accumulatedLength = length - distanceCovered;
        }
    }

    newCoordinates.push(coordinates[coordinates.length - 1]);
    return new LineString(newCoordinates);
}

/**
 * Helper function to interpolate between two coordinates.
 * @param {Array<number>} start - The starting coordinate [x, y].
 * @param {Array<number>} end - The ending coordinate [x, y].
 * @param {number} factor - The interpolation factor (0 to 1).
 * @returns {Array<number>} - The interpolated coordinate [x, y].
 */
function interpolateCoordinates(start, end, factor) {
    const x = start[0] + factor * (end[0] - start[0]);
    const y = start[1] + factor * (end[1] - start[1]);
    return [x, y];
}


/**
 * Function to ensure an OpenLayers LineString is not overlapping and is continuous.
 * This function removes duplicate consecutive points and ensures all segments are connected.
 * @param {LineString} lineString - The original OpenLayers LineString geometry.
 * @returns {LineString} - A new LineString geometry that is continuous and non-overlapping.
 */
export function ensureContinuousLineString(lineString: LineString) {
    const coordinates = lineString.getCoordinates();
    const cleanedCoordinates: Coordinate[] = [];

    if (coordinates.length === 0) {
        return new LineString(cleanedCoordinates);
    }

    cleanedCoordinates.push(coordinates[0]);

    for (let i = 1; i < coordinates.length; i++) {
        const prev = cleanedCoordinates[cleanedCoordinates.length - 1];
        const current = coordinates[i];

        // if (Math.abs(prev[0] - current[0]) < 10 && Math.abs(prev[1] - current[1]) < 10) {
        //     current = prev
        // }
        // cleanedCoordinates.push(current);

        // Only add the point if it is not the same as the previous point
        if (prev[0] !== current[0] || prev[1] !== current[1]) {
            cleanedCoordinates.push(current);
        }
    }

    return new LineString(cleanedCoordinates);
}
