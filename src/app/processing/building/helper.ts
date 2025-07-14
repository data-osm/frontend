import { BufferAttribute, BufferGeometry, Group, Shape, ShapeGeometry } from "three";
import Vec2 from "../math/vector2";
import { BufferGeometryUtils } from "three/examples/jsm/Addons";
import { OMBBResult } from "./ombb-params";

export class BuildingsTile extends Group {
    readonly isFeatureTile = true;
    readonly type = 'BuildingTile';
    key: string

    userData: {

    };


}

export function createShadowGeometry(ombbList: Array<[Vec2, Vec2, Vec2, Vec2, number]>): BufferGeometry {
    const geometries: BufferGeometry[] = [];

    for (const corners of ombbList) {
        // const shape = new Shape();
        // shape.moveTo(corners[0].x, corners[0].y);
        // shape.lineTo(corners[1].x, corners[1].y);
        // shape.lineTo(corners[2].x, corners[2].y);
        // shape.lineTo(corners[3].x, corners[3].y);
        // shape.lineTo(corners[0].x, corners[0].y);
        const z = corners[4] + 1
        const vertices = new Float32Array([
            corners[0].x, corners[0].y, z,
            corners[1].x, corners[1].y, z,
            corners[2].x, corners[2].y, z,

            corners[0].x, corners[0].y, z,
            corners[2].x, corners[2].y, z,
            corners[3].x, corners[3].y, z,
        ]);


        const geom = new BufferGeometry();
        geom.setAttribute('position', new BufferAttribute(vertices, 3));
        // const geom = new ShapeGeometry(shape);
        // // geom.rotateX(-Math.PI / 2);
        // // Rehausser légèrement pour éviter z-fighting
        // geom.translate(0, 0, corners[4] + 1);
        geometries.push(geom);
    }

    const merged = BufferGeometryUtils.mergeGeometries(geometries, false);


    return merged;
}