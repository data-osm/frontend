import getFacadeParamsFromTags from "./facade-params";
import getRoofOrientation, { getRoofParams } from "./roof-params";
import { BuildingFacadeMaterial, BuildingProperties, BuildingRoofMaterial, BuildingRoofOrientation, BuildingRoofType } from "./type";

export const LEVEL_HEIGHT = 4;

const buildingsWithoutWindows: string[] = [
    'garage',
    'garages',
    'greenhouse',
    'storage_tank',
    'bunker',
    'silo',
    'stadium',
    'ship',
    'castle',
    'service',
    'digester',
    'water_tower',
    'shed',
    'ger',
    'barn',
    'slurry_tank',
    'container',
    'carport'
];

export function isBuildingHasWindows(building_properties: BuildingProperties): boolean {
    const windowsValue = <boolean>building_properties.windows;

    if (windowsValue !== undefined) {
        return windowsValue;
    }

    return !buildingsWithoutWindows.includes(<string>building_properties.building_type);
}



export function getBuildingParams(
    building_properties: BuildingProperties
): {
    label: string;
    buildingLevels: number;
    buildingHeight: number;
    buildingMinHeight: number;
    buildingRoofHeight: number;
    buildingRoofType: BuildingRoofType;
    buildingRoofOrientation: BuildingRoofOrientation;
    buildingRoofDirection: number;
    // buildingRoofAngle: number;
    buildingFacadeMaterial: BuildingFacadeMaterial;
    buildingFacadeColor: number;
    buildingRoofMaterial: BuildingRoofMaterial;
    buildingRoofColor: number;
    buildingWindows: boolean;
    buildingFoundation: boolean;
    rnb: string
    match_rnb_ids: string;
    is_part: boolean;
    building: string;
} {
    const fallbackLevels = 1;


    const isRoof = building_properties.building_type === 'roof';

    const hasFoundation = !isRoof &&
        building_properties.levels === undefined &&
        building_properties.min_level === undefined &&
        building_properties.height === undefined &&
        building_properties.min_height === undefined;

    const roofParams = getRoofParams(building_properties);
    const roofOrientation = getRoofOrientation(building_properties.roof_orientation);
    const roofLevels = building_properties.roof_levels <= 0 ? 0.6 : <number>building_properties.roof_levels ?? (roofParams.type === 'flat' ? 0 : 1);
    const roofDirection = <number>building_properties.roof_direction ?? null;
    // const roofAngle = <number>building_properties.roof_angle ?? null;
    let roofHeight = <number>building_properties.roof_height ?? (roofLevels * LEVEL_HEIGHT);

    let minLevel = <number>building_properties.min_level ?? null;
    let height = <number>building_properties.height ?? null;
    let levels = <number>building_properties.levels ?? null;
    let minHeight = <number>building_properties.min_height ?? null;

    if (height !== null) {
        roofHeight = Math.min(roofHeight, height - (minHeight ?? 0));
    }

    if (height === null && levels === null) {
        levels = (minLevel !== null) ? minLevel : fallbackLevels;
        height = levels * LEVEL_HEIGHT + roofHeight
    } else if (height === null) {
        height = levels * LEVEL_HEIGHT + roofHeight
    } else if (levels === null) {
        levels = Math.max(1, Math.round((height - roofHeight) / LEVEL_HEIGHT));
    }

    if (minLevel === null) {
        if (minHeight !== null) {
            minLevel = Math.min(levels - 1, Math.round(minHeight / LEVEL_HEIGHT));
        } else {
            minLevel = 0;
        }
    }

    if (minHeight === null) {
        minHeight = Math.min(minLevel * LEVEL_HEIGHT, height);
    }

    const facadeParams = getFacadeParamsFromTags(building_properties);
    const label = <string>building_properties.name ?? null;

    let windows = isBuildingHasWindows(building_properties);
    if (height - minHeight - roofHeight < 2) {
        windows = false;
    }

    return {
        label: label,
        buildingLevels: levels - minLevel,
        buildingHeight: height,
        buildingMinHeight: isRoof ? (height - roofHeight) : minHeight,
        buildingRoofHeight: roofHeight,
        buildingRoofType: roofParams.type,
        buildingRoofOrientation: roofOrientation,
        buildingRoofDirection: roofDirection,
        // buildingRoofAngle: roofAngle,
        buildingFacadeMaterial: facadeParams.material,
        buildingFacadeColor: facadeParams.color,
        buildingRoofMaterial: roofParams.material,
        buildingRoofColor: roofParams.color,
        buildingWindows: windows,
        buildingFoundation: hasFoundation,
        rnb: building_properties.rnb,
        match_rnb_ids: building_properties.match_rnb_ids,
        is_part: building_properties.is_part,
        building: building_properties.building,
    };
}
