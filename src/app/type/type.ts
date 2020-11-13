import { StorageServiceService } from '../services/storage-service/storage-service.service'
/**
 * Properties of a right menu
 */
export interface rightMenuInterface {
  name: string,
  tooltip: string,
  active: boolean,
  enable: boolean,
  title: string
}

/**
 * interface for classes that represent a categorie of a couche
 * @interface coucheInterface
 */
export interface categorieInterface {
  /**
   * Select statement of the querry
   */
  select: string | null,
  /**
   * Is the querry OSM in plain text ?
   */
  mode_sql: boolean,
  /**
   * Where satement of the querry if mode_sql is true
   */
  sql_complete: null | string
}

/**
 * interface for classes that represent a cle-val-osm of a couche
 * @interface clesValOsmInterface
 */
export interface clesValOsmInterface {
  /**
   * Key
   */
  action: string
  /**
   * Condition
   */
  condition: "AND" | "OR"
  /**
   * Id in DB
   */
  id: number
  /**
   * Id of the categorie
   */
  id_cat: number
  /**
   * Value of the key
   */
  nom: string
  /**
   * Operateur to compare key and action
   */
  operateur: number
}

/**
 * interface for classes that represent a couche
 * @interface coucheInterface
 */
export interface coucheInterface {
  /**
   * Extend of the layer if exists
   * @example "40.91789245605469,29.5161103,40.91789245605469,29.5161103"
   */
  bbox: string | null
  /**
   * categorie of the layer
   */
  categorie: categorieInterface
  /**
    * Is the layer in map ?
    */
  check: boolean
  /**
   * Only if wms_type is OSM and categorie.mode_sql is false
   * Expressions to define the querry for OSM
   */
  cles_vals_osm: Array<clesValOsmInterface> | null
  colonnes: Array<{ nom: string, champ: string }>
  contour_couleur: null
  /**
   * total lenght of the data. If geom is  LineString
   */
  distance_totale: string | null
  file_json: null
  /**
   * Geometry type
   */
  geom: "point" | "Polygon" | "LineString"
  /**
   * Categorie ID in DB
   */
  id_cat: number
  /**
   * Table in DB
   */
  id_couche: string
  /**
   * Identifiant in QGIS SERVER for WFS/WMS/WMTS
   */
  identifiant: string
  /**
   * Path for icon type circular
   */
  img: string
  /**
   * Id in DB
   */
  key_couche: number
  /**
   * Path for icon type  square
   */
  logo_src: string | null
  /**
   * Metadata
   */
  metadata: Array<any>
  /**
   * name
   */
  nom: string
  /**
   * Number of data in layer
   */
  number: number
  opacity: null
  params_files: {
    /**
     * Name of the categorie
     */
    nom_cat: string,
    /**
     * Is layer in a sous thematique ?
     */
    sous_thematiques: boolean,
    /**
     * Id of the couche in DB
     */
    key_couche: number,
    /**
     * id categorie
     */
    id_cat: number
  }
  /**
   * Projection of the layer
   */
  projection: null
  remplir_couleur: null
  status: false
  /**
   * total area of the data. If geom is  Polygon
   */
  surface_totale: number | null
  /**
   * Method to render layer
   */
  type_couche: "wms" | "wfs"
  /**
   * render layer in wms ?, if false, render layer in wfs
   */
  service_wms: boolean
  /**
   * Url of QGIS SERVER
   */
  url: string
  /**
   * If data is from OSM
   */
  wms_type: "osm" | null
  /**
   * Zoom max
   */
  zmax: number
  /**
   * Zoom min
   */
  zmin: number
}

/**
 * Interface for classes that represent a sous thematiaue
 * @interface sousThematiqueInterface
 */
export interface sousThematiqueInterface {
  active: boolean
  /**
   * The layers
   */
  couches: Array<coucheInterface>
  id: number
  /**
   * Id in DB
   */
  key: number
  /**
   * Name
   */
  nom: string
}

export interface groupInterface {
  /**
   *  background color
   */
  color: string | null
  /**
   * Name
   */
  nom: string
  /**
   * Path to the icon
   */
  img: string
}
/**
 * interface for classes that represent a thematique
 * @interface groupThematiqueInterface
 */
export interface groupThematiqueInterface extends groupInterface {

  id: number
  /**
   * Identifiant in database
   */
  id_thematique: number


  /**
   * Order to show
   */
  ordre: number
  /**
   * shema in database
   */
  shema: string,
  /**
   * Sous thematiques
   */
  sous_thematiques: false | Array<sousThematiqueInterface>
  /**
   * If sous_thematiques is false
   * Couches
   */
  couches?: Array<coucheInterface>
}

/**
 * Interface for a carte
 * @interface carteInterface
 */
export interface carteInterface {
  /**
  * Extend of the layer if exists
  * @example "40.91789245605469,29.5161103,40.91789245605469,29.5161103"
  */
  bbox: string | null
  /**
   * Is layer in map ?
   */
  check: boolean
  commentaire: string
  geom: null
  /**
   * Identifiant for WMS/WMTS
   */
  identifiant: null
  /**
   * Path for icon
   */
  image_src: string
  /**
   * Should this map interrogeable with a  get feature info ?
   */
  interrogeable: boolean
  /**
   * Id in DB
   */
  key_couche: number
  /**
   * Metadata
   */
  metadata: Array<any>
  /**
   * Name
   */
  nom: string
  /**
   * is it the principal map of the apps ?
   */
  principal: boolean
  /**
   * Projection
   */
  projection: string | null
  /**
   * Method to render
   */
  type: "xyz" | "WMS" | "PDF"
  /**
   * Url for wms/wmts
   */
  url: string
  /**
   * Zoom max
   */
  zmax: string
  /**
   * Zoom min
   */
  zmin: string

}

// carteInterface.prototype['vv']=function () {
//   console.log('hh')
// }
/**
 * Interface for a sous carte
 * @interface sousCarteIntgerface
 */
export interface sousCarteIntgerface {
  active: false
  couches: Array<carteInterface>,
  id: number,
  /**
   * Id in DB
   */
  key: number
  /**
   * Name
   */
  nom: string
}

/**
 * interface for classes that represent a group of carte
 * @interface groupCarteInterface
 */
export interface groupCarteInterface extends groupInterface {

  id: number
  /**
   * Identifiant in database
   */
  id_cartes: number
  /**
   * Is this group the principal group of cartes
   */
  principal: boolean
  /**
   * Sous thematiques
   */
  sous_cartes: false | Array<sousCarteIntgerface>
  /**
   * If sous_cartes is false
   * Couches
   */
  couches?: Array<carteInterface>
}

/**
 * Interface for a geograohic limit of the project
 * @interface limitesAdminstratives
 */
export interface limitesAdminstratives {
  /**
   * Id in DB
   */
  id_limite: number
  /**
   * Id of the associated couche
   */
  key_couche: number
  /**
   * Name
   */
  nom: string
  /**
   * Name of the table in DB
   */
  nom_table: string
  /**
   * Is the associated couche in a sous thematique ?
   */
  sous_thematiques: boolean
}

/**
 * Interface for the configuration of the project
 */
export interface configProjetInterface {
  /**
   * Extent of the project
   * Array of 4 length
   * @example [-6880641.45274482, -2438421.01533876, 6215722.16260819, 6675534.94618776]
   */
  bbox: Array<Number>
  /**
   * Geojson of the region of interest
   */
  roiGeojson: any
  /**
   * Geographic limit of the project
   */
  limites: Array<limitesAdminstratives>
  /**
   * Geosignets of the projects
   */
  geosignetsProject: geosignetsProjectInterface[]

}

/**
 * Interface for the pre configure geosignets of the projects
 */
export interface geosignetsProjectInterface {
  /**
   * Is the geosignet active ?
   */
  active: boolean
  geometry: string
  /**
   * Id in DB
   */
  id: number
  /**
   * Name
   */
  nom: string
}

/**
 * User interface
 */
export interface User {
  /**
   * Name of the user
   */
  username: string
  id: number
  /**
   * email of the user
   */
  email: string
}

/**
 * Interface of the model return when user  search a emprise
 */
export interface ResponseOfSerachLimitInterface {
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
  geometry?: any
}

/**
 * interface of a icon
 */
export interface Icon {
  icon_id: number
  path: string
  name: string
  category: string
  icon?: File
  tags: string[]
  attribution: string
}
/**
 * interface of a vector provider
 */
export interface VectorProvider {
  provider_vector_id: number
  name:string
  /** the table where data are store */
  table:string
  /** the shema where data are store */
  shema:string
  geometry_type:'Polygon'|'Point'|'LineString'
  /** url of the carto server */
  url_server:string
  /** identifiant of this ressource in the carto server */
  id_server:string
  /**extent of this ressource  */
  extent:[number,number,number,number]
  z_min:number
  z_max:number
  /**
   * number of feature of this ressources 
   */
  count:number
  /**
   * total lenght of the ressource if geometry type is LineString 
   */
  total_lenght:number
  /**
   * total area of the ressource if geometry type is Polygon 
   */
  total_area:number
  epsg:number
  /**
   * state of the data
   */
  state:'good'|'not_working'|'action_require'|'unknow'
}

/**
 * interface of an osm querry
 */
export interface OsmQuerry{
  select:string,
  where:string,
  sql?:string
  provider_vector_id:number
}

/**
 * interface of a style
 */
export interface Style{
  name:string
  provider_style_id:string
  provider_vector_id:number
  custom_style_id:number
}