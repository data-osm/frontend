import { Picto } from "./picto";

export interface BaseMap {
    id:number
    pictogramme:Picto
    name: string,
    url: string,
    protocol_carto: 'wms'|'wmts',
    identifiant: string,
    attribution: string,
    principal:boolean
}