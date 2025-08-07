import { Feature } from 'ol';
import { AttributeInterface, ConfigTagsOsm } from '../osm-sheet/osm-sheet.component';
import { BuildingProperties } from '../../../../processing/building/type';
const BUILDING_FIELDS = {
    "osm_id": {
        "fr_name": "ID OSM",
    },
    "rnb": {
        "fr_name": "ID RNB",
    },
    "diff_rnb": {
        "fr_name": "Informations Supp du RNB",
    },
    "building_type": {
        "fr_name": "Type de bâtiment",
    },
    "color": {
        "fr_name": "Couleur",
    },
    "height": {
        "fr_name": "Hauteur",
    },
    "min_height": {
        "fr_name": "Hauteur minimale",
    },
    "levels": {
        "fr_name": "Nombre d'étages",
    },
    "min_level": {
        "fr_name": "Nombre d'étages minimal",
    },
    "roof_height": {
        "fr_name": "Hauteur du toit",
    },
    "roof_levels": {
        "fr_name": "Nombre d'étages du toit",
    },
    "material": {
        "fr_name": "Matériau",
    },
    "roof_type": {
        "fr_name": "Type de toit",
    },
    "roof_color": {
        "fr_name": "Couleur du toit",
    },
    "roof_material": {
        "fr_name": "Matériau du toit",
    },
}

/**
  * Format feature attributes
  */
export function formatFeatureAttributes(feature: Feature): AttributeInterface[] {
    let properties = feature.getProperties()
    return Object.keys(BUILDING_FIELDS)
        .filter((key) => properties.hasOwnProperty(key) && properties[key])
        .map((key) => {
            return {
                field: BUILDING_FIELDS[key].fr_name,
                value: properties[key],
                display: true
            }
        })

}

export function getFields() {
    return Object.keys(BUILDING_FIELDS).map((key) => {
        return key
    })
}

export function getOsmLink(feature: Feature) {
    let properties = feature.getProperties() as BuildingProperties
    const osmType = properties.osm_type

    let osmId = Math.abs(properties.osm_id)
    return `https://www.openstreetmap.org/${osmType.toLowerCase()}/${osmId}`
}

export function formatColor(decimalColor: number) {
    return '#' + decimalColor.toString(16).padStart(6, '0');
}