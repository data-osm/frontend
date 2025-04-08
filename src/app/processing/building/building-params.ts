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

    return !buildingsWithoutWindows.includes(<string>building_properties.buildingType);
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
    buildingRoofAngle: number;
    buildingFacadeMaterial: BuildingFacadeMaterial;
    buildingFacadeColor: number;
    buildingRoofMaterial: BuildingRoofMaterial;
    buildingRoofColor: number;
    buildingWindows: boolean;
    buildingFoundation: boolean;
} {
    const fallbackLevels = 1;


    const isRoof = building_properties.buildingType === 'roof';

    const hasFoundation = !isRoof &&
        building_properties.levels === undefined &&
        building_properties.minLevel === undefined &&
        building_properties.height === undefined &&
        building_properties.minHeight === undefined;

    const roofParams = getRoofParams(building_properties);
    const roofOrientation = getRoofOrientation(building_properties.roofOrientation);
    const roofLevels = building_properties.roofLevels <= 0 ? 0.6 : <number>building_properties.roofLevels ?? (roofParams.type === 'flat' ? 0 : 1);
    const roofDirection = <number>building_properties.roofDirection ?? null;
    const roofAngle = <number>building_properties.roofAngle ?? null;
    let roofHeight = <number>building_properties.roofHeight ?? (roofLevels * LEVEL_HEIGHT);

    let minLevel = <number>building_properties.minLevel ?? null;
    let height = <number>building_properties.height ?? null;
    let levels = <number>building_properties.levels ?? null;
    let minHeight = <number>building_properties.minHeight ?? null;

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
        buildingRoofAngle: roofAngle,
        buildingFacadeMaterial: facadeParams.material,
        buildingFacadeColor: facadeParams.color,
        buildingRoofMaterial: roofParams.material,
        buildingRoofColor: roofParams.color,
        buildingWindows: windows,
        buildingFoundation: hasFoundation
    };
}
