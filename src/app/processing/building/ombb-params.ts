import { BuildingProperties } from "./type";
import Vec2 from "../math/vector2";

export type OMBBResult = [Vec2, Vec2, Vec2, Vec2];

export function isTagsContainOMBB(building_properties: BuildingProperties): boolean {
    return building_properties['@ombb00'] !== undefined;
}

export function getOMBB(building_properties: BuildingProperties): OMBBResult {
    if (!isTagsContainOMBB(building_properties)) {
        return null;
    }

    return [
        new Vec2(<number>building_properties['@ombb00'], <number>building_properties['@ombb01']),
        new Vec2(<number>building_properties['@ombb10'], <number>building_properties['@ombb11']),
        new Vec2(<number>building_properties['@ombb20'], <number>building_properties['@ombb21']),
        new Vec2(<number>building_properties['@ombb30'], <number>building_properties['@ombb31'])
    ];
}