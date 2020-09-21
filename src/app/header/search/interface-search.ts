export interface responseOfSearchPhotonInterface {
  "type": "FeatureCollection",
  "features": Array<
    {
      "type": "Feature",
      "geometry": {
        "coordinates": [number, number],
        "type": "Point"
      },
      "properties": {
        "city": string,
        "country": string,
        "name": string,
        "osm_id": number,
        "extent": [number, number, number, number]
        [key: string]: any
      }
    }
  >
}
/**
 * Interface of the model return when user  search a emprise
 */
export interface responseOfSerachLimitInterface {
  /**
   * DB table corresponding
   */
  table: string
  /**
   * id DB of in the table
   */
  id: number
  /**
   * name of the limit
   */
  limitName: string
  /**
   * name
   */
  name: string
  ref: string
}
