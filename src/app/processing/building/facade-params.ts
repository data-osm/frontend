import { BuildingFacadeMaterial, BuildingProperties } from "./type";

const lookup: Record<string, {
    type: BuildingFacadeMaterial;
    defaultColor: number;
}> = {
    brick: { type: 'brick', defaultColor: 0x8c4834 },
    cement_block: { type: 'cementBlock', defaultColor: 0xffffff },
    block: { type: 'cementBlock', defaultColor: 0xffffff },
    wood: { type: 'wood', defaultColor: 0xffffff },
    plaster: { type: 'plaster', defaultColor: 0xffffff },
    plastered: { type: 'plaster', defaultColor: 0xffffff },
    concrete: { type: 'plaster', defaultColor: 0xdddddd },
    hard: { type: 'plaster', defaultColor: 0xdddddd },
    glass: { type: 'glass', defaultColor: 0xffffff },
    mirror: { type: 'glass', defaultColor: 0xffffff },
};



export default function getFacadeParamsFromTags(building_properties: BuildingProperties): {
    material: BuildingFacadeMaterial;
    color: number;
} {
    const materialTagValue = <string>building_properties.material
    const colorTagValue = <number>building_properties.color;

    const config = lookup[materialTagValue] ?? lookup.plaster;
    const color = colorTagValue ?? config.defaultColor;

    return {
        material: config.type,
        color: color
    };
}