import { Group } from "three"
import { Layer, LayerEvents, LayerUserData } from "../app/giro-3d-module"
import { ReplaySubject } from "rxjs"

/**
 * Interface of the table of contents capabilities
 */
export interface TocCapabilitiesInterface {
    /**
         * Can change opactity ?
         */
    opacity: boolean,
    /**
     * have metadata ?
     */
    metadata: boolean,
    /**
     * Can be shared ?
     */
    share: boolean
    /**
     * Can be automatically remove when the user wnant to clear the map ?
     */
    removable: boolean
}
/**
 * Interface of the legend capabilities
 */
export interface legendCapabilitiesInterface {
    /**
     * url of the img icon
     */
    urlImg?: string
    /**
     * use legend from the carto server
     */
    useCartoServer?: boolean
    description: string
}

export interface LayerGiroUserData extends LayerUserData {
    "nom": string
    "type_layer": 'geosmCatalogue' | 'draw' | 'mesure' | 'mappilary' | 'exportData' | 'other' | 'routing',
    "image": string
    "properties": {
        type: 'couche' | 'carte',
        couche_id: number
        [key: string]: any
    }
    "zIndex": number
    "visible": boolean
    "data": any,
    /**
     * text and background color of the badje in the table of contents
     */
    "badge"?: {
        text: string,
        bgColor: string
    }

    /**
   * capabilities of the layer in toc. They user can set opactiy ? read metadata ?...
   * By default, all is set to true
   */
    "tocCapabilities": TocCapabilitiesInterface
    /**
     * capabilities of the layer legend. how to display legend of the layer ? with the url of a image ? with the legend of the carto server ?
     * by default this is none => no legend to display
     */
    "legendCapabilities"?: legendCapabilitiesInterface[]
    /**
     * description sheet capabilities
     */
    "descriptionSheetCapabilities": 'osm'
}
/**
 * Interface of all layers in the map
 */
export interface LayersInMap extends LayerGiroUserData {
    /**
    * The layer type giro in the map
    */
    layer: Array<Layer<LayerEvents, LayerGiroUserData>>
    threeLayers: Array<Group>
}

export const TypeLayer = ['geosmCatalogue', 'draw', 'mesure', 'mappilary', 'exportData', 'other', 'routing']
/**
 * interface to construct  a layer
 */
export interface DataOSMLayer {
    'nom': string,
    cercle_icon: string
    /**
     * is the layer should appear in the toc ?
     */
    'inToc': boolean
    'type_layer': 'geosmCatalogue' | 'draw' | 'mesure' | 'mappilary' | 'exportData' | 'other' | 'routing',
    'type': 'geojson' | 'wfs' | 'wms' | 'xyz',
    geometryType: 'Polygon' | 'Point' | 'LineString' | 'null',
    'crs'?: string,
    'visible': boolean,
    'strategy'?: "bbox" | "all",
    'load'?: boolean,
    'style'?: any,
    'maxzoom'?: number,
    'minzoom'?: number,
    "zindex"?: number,
    "size"?: number,
    "cluster"?: boolean,
    "icon"?: string,
    "iconImagette"?: string,
    "url"?: string,
    "identifiant"?: string[],
    "styleWMS"?: string[],
    /**
     * Number of features if know
     */
    "count"?: number
    /**
     * capabilities of the layer in toc. They user can set opactiy ? read metadata ?...
     * By default, all is set to true
     */
    tocCapabilities: TocCapabilitiesInterface
    /**
     * capabilities of the layer legend. how to display legend of the layer ? with the url of a image ? with the legend of the carto server ?
     * by default this is none => no legend to display
     */
    legendCapabilities?: legendCapabilitiesInterface[]
    properties: {
        group_id: number,
        couche_id: number,
        type: 'couche' | 'carte'
    }
    descriptionSheetCapabilities: 'osm',
    /**
     * Observable when emit, the three JS Object no more updated
     */
    destroyedInstancedMesh$?: ReplaySubject<boolean>
}

export interface FrameRenderTime {
    "render_time": number,
    "total_render_time": number,
}