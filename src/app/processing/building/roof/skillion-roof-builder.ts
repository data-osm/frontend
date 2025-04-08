import { Box3, MathUtils, Vector3 } from "three";
import { Extent } from "../../../giro-3d-module";
import { RoofGeometry, RoofParams, RoofSkirt, RoofSkirtPolyline, RoofBuilder } from "./type";
import Vec2 from "../../math/vector2";
import { calculateNormal, getRotationVectorsFromOMBB } from "./utils";
import Tile3DMultipolygon from "../tile3d-multipolygon";
import Vec3 from "../../math/vector3";


const temp_box = new Box3()
export default class SkillionRoofBuilder implements RoofBuilder {
    private getRoofHeightFromAngle(bbox: Extent, angle: number): number {

        return (bbox.topLeft().y - bbox.bottomLeft().y) * Math.tan(MathUtils.degToRad(angle));
    }

    private getRotation(params: RoofParams): number {
        if (params.direction !== null) {
            return -MathUtils.degToRad(params.direction) - Math.PI / 2;
        }

        const ombb = params.multipolygon.getOMBB();
        const ombbVectors = getRotationVectorsFromOMBB(ombb, params.orientation ?? 'along', null);

        return -Vec2.normalize(ombbVectors.rotVector0).getAngle() - Math.PI / 2;
    }

    private getRotatedMultipolygonAABB(multipolygon: Tile3DMultipolygon, rotation: number): Extent {
        temp_box.makeEmpty()
        for (const ring of multipolygon.rings) {

            for (const node of ring.nodes) {
                const newNode = Vec2.rotate(new Vec2(node.y, node.x), rotation)
                temp_box.expandByPoint(new Vector3().set(
                    newNode.x,
                    newNode.y,
                    0
                ))
            }
        }

        return Extent.fromBox3("EPSG:3857", temp_box);
    }

    public build(params: RoofParams): RoofGeometry {
        const { multipolygon } = params;
        const skirt: RoofSkirt = [];
        const rotation = this.getRotation(params);
        const bbox = this.getRotatedMultipolygonAABB(multipolygon, rotation);

        let facadeHeightOverride: number = null;
        let height = params.height;
        let minHeight = params.minHeight;

        if (params.angle !== null && params.angle !== undefined) {
            height = this.getRoofHeightFromAngle(bbox, params.angle)
            minHeight = params.buildingHeight - height;
            facadeHeightOverride = params.buildingHeight - height;
        }

        const footprint = multipolygon.getFootprint({
            height: 0,
            flip: false
        });


        for (let i = 0; i < footprint.positions.length; i += 3) {
            const x = footprint.positions[i];
            const y = footprint.positions[i + 1];


            const vec = Vec2.rotate(new Vec2(y, x), rotation);
            const z = (vec.y - bbox.bottomLeft().y) / (bbox.topRight().y - bbox.bottomLeft().y);

            footprint.positions[i + 2] = minHeight + z * height * 1;
        }

        const bboxHeight = bbox.topLeft().y - bbox.bottomLeft().y;
        const uvScaleX = 1 / params.scaleX;
        const uvScaleY = 1 / Math.sin(Math.atan(bboxHeight / height)) / params.scaleY;

        for (let i = 0; i < footprint.uvs.length; i += 2) {
            const x = footprint.uvs[i];
            const y = footprint.uvs[i + 1];
            const vec = Vec2.rotate(new Vec2(y, x), rotation);

            footprint.uvs[i] = (vec.x - bbox.bottomLeft().x) * uvScaleX;
            footprint.uvs[i + 1] = (vec.y - bbox.bottomLeft().y) * uvScaleY;
        }

        for (const ring of multipolygon.rings) {
            const skirtPolyline: RoofSkirtPolyline = {
                points: [],
                hasWindows: true
            };
            skirt.push(skirtPolyline);

            for (const node of ring.nodes) {
                const vec = Vec2.rotate(new Vec2(node.y, node.x), rotation);
                const z = (vec.y - bbox.bottomLeft().y) / (bbox.topRight().y - bbox.bottomLeft().y);

                skirtPolyline.points.push({
                    position: node,
                    height: minHeight + z * height
                });
            }
        }

        const p0 = new Vec3(footprint.positions[0], footprint.positions[1], footprint.positions[2]);
        const p1 = new Vec3(footprint.positions[3], footprint.positions[4], footprint.positions[5]);
        const p2 = new Vec3(footprint.positions[6], footprint.positions[7], footprint.positions[8]);
        // const normal = calculateNormal(p0, p2, p1);
        const normal = calculateNormal(p0, p1, p2);

        for (let i = 0; i < footprint.normals.length; i += 3) {
            footprint.normals[i] = normal.x;
            footprint.normals[i + 1] = normal.y;
            footprint.normals[i + 2] = normal.z;
        }

        return {
            addSkirt: true,
            skirt: skirt,
            facadeHeightOverride: facadeHeightOverride,
            position: footprint.positions,
            normal: footprint.normals,
            uv: footprint.uvs
        };
    }
}