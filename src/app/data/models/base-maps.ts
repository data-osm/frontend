import { Picto } from "./picto";

export interface BaseMap {
    id:number
    pictogramme:Picto
    name: string,
    url: string,
    protocol_carto: string,
    identifiant: string,
    attribution: string,
}