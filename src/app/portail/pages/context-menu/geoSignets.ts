import { Map } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { CartoHelper } from '../../../../helper/carto.helper';
import { Point } from '../../../ol-module';
/**
 * describe a geosignet
 */
export interface geosignetInterface {
  id?: number,
  coord: Coordinate,
  zoom: number,
  nom: string,
}

export class geosignets {

  constructor(
    public map:Map
  ){}
  /**
   * get all geosignets
   * @return Array<geosignetInterface>
   */
  getAllGeosignets(): Array<geosignetInterface> {
    var allGeoSignets:Array<geosignetInterface> = []
    if (localStorage.getItem("signets")) {
      for (
        let index = 0;
        index < localStorage.getItem("signets").split(";").length;
        index++
      ) {
        const element = localStorage.getItem("signets").split(";")[index];
        allGeoSignets.push(JSON.parse(element));
      }

    }

    return allGeoSignets
  }

  getGeoSignet(id:number):geosignetInterface{
    for (
      let index = 0;
      index < this.getAllGeosignets().length;
      index++
    ) {
      const element = this.getAllGeosignets()[index];
      if (element.id == id) {
        return element
      }
    }

  }

  addGeoSignet(geosignet: geosignetInterface) {
    var allGeoSignets = this.getAllGeosignets()
    if (!geosignet.id) {
      geosignet.id = allGeoSignets.length
    }

    var signets_text = [JSON.stringify(geosignet)];
    for (let index = 0; index < allGeoSignets.length; index++) {
      const element = allGeoSignets[index];
      signets_text.push(JSON.stringify(element));
    }

    localStorage.setItem("signets", signets_text.join(";"));

  }

  /**
   * go to a geo signet
   * @param id number id of the geosignet
   */
  goToAGeosignet(id:number){
    var geosignet = this.getGeoSignet(id)
    if (geosignet) {
      new CartoHelper(this.map).fit_view(new Point(geosignet.coord),geosignet.zoom)
    }
  }

}
