import { BuildingProperties, BuildingRoofMaterial, BuildingRoofOrientation, BuildingRoofType } from "./type";


const roofLookupType: Record<string, BuildingRoofType> = {
    flat: 'flat',
    hipped: 'hipped',
    gabled: 'gabled',
    gambrel: 'gambrel',
    pyramidal: 'pyramidal',
    onion: 'onion',
    dome: 'dome',
    round: 'round',
    skillion: 'skillion',
    mansard: 'mansard',
    quadruple_saltbox: 'quadrupleSaltbox',
    saltbox: 'saltbox',
};

export function getRoofType(
    shape: string,
    fallback: BuildingRoofType = 'flat'
): BuildingRoofType {
    return roofLookupType[shape] ?? fallback;
}

const buildingExceptions: string[] = [
    'roof',
    'stadium',
    'houseboat',
    'castle',
    'greenhouse',
    'storage_tank',
    'silo',
    'stadium',
    'ship',
    'bridge',
    'digester',
    'water_tower',
    'shed'
];

export function isBuildingSupportsDefaultRoof(building_properties: BuildingProperties): boolean {
    const defaultRoofTag = <boolean>building_properties.defaultRoof;

    if (defaultRoofTag !== undefined) {
        return defaultRoofTag;
    }

    return !buildingExceptions.includes(<string>building_properties.buildingType);
}


const roofLookupMaterial: Record<string, BuildingRoofMaterial> = {
    tile: 'tiles',
    tiles: 'tiles',
    roof_tiles: 'tiles',
    slate: 'tiles',
    metal: 'metal',
    metal_sheet: 'metal',
    'metal sheet': 'metal',
    tin: 'metal',
    copper: 'metal',
    zinc: 'metal',
    concrete: 'concrete',
    asphalt: 'concrete',
    eternit: 'eternit',
    asbestos: 'eternit',
    thatch: 'thatch',
    grass: 'grass',
    glass: 'glass',
    tar_paper: 'tar'
};

export function getRoofMaterial(
    material: string,
    fallback: BuildingRoofMaterial = 'concrete'
): BuildingRoofMaterial {
    return roofLookupMaterial[material] ?? fallback;
}

export function getRoofParams(building_properties: BuildingProperties): {
    type: BuildingRoofType;
    material: BuildingRoofMaterial;
    color: number;
} {
    const type = getRoofType(<string>building_properties.roofType, 'flat');
    const noDefault = !isBuildingSupportsDefaultRoof(building_properties) || type !== 'flat';

    const materialTagValue = <string>building_properties.roofMaterial;
    const colorTagValue = <number>building_properties.roofColor;

    let material = getRoofMaterial(materialTagValue, 'default');
    let color = colorTagValue ?? null;

    if ((color !== null || noDefault) && material === 'default') {
        material = 'concrete';
    }

    if (color === null) {
        switch (material) {
            case 'concrete': {
                color = 0xBBBBBB;
                break;
            }
            case 'metal': {
                color = materialTagValue === 'copper' ? 0xA3CABD : 0xC3D2DD;
                break;
            }
            case 'tiles': {
                color = materialTagValue === 'slate' ? 0x8C8C97 : 0xCB7D64;
                break;
            }
            default: {
                color = 0xffffff;
            }
        }
        // 0xA3CABD.toString(16).padStart(6, '0')
    }

    return {
        type: type,
        material: material,
        color: color
    };
}

export default function getRoofOrientation(str: string): BuildingRoofOrientation {
    if (str === 'along' || str === 'across') {
        return str;
    }

    return null;
}