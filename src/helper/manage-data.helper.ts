/**
* Some functions to handle data
*
**/
export class manageDataHelper {

  /**
   * generate random id
   * @return string
   */
  public static makeid(): string {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  /**
  * calculate a matrice of pixels around one pixel. The rayon is 5
   * @see https://github.com/openlayers/openlayers/issues/5862
   * @param number[] pixel
   * @return Array<Array<number>>
   */
  calcHitMatrix(pixel: number[]): Array<Array<number>> {
    let X = 11; // -5 to + 5 in x
    let Y = 11; // -5 to + 5 in y
    let x = 0;
    let y = 0;
    let dx = 0;
    let dy = -1;
    let t = Math.max(X, Y);
    let maxI = t * t;
    let pixelX = pixel[0];
    let pixelY = pixel[1];
    var all_pixels = []
    for (let i = 0; i < maxI; i++) {
      if ((-X / 2 <= x) && (x <= X / 2) && (-Y / 2 <= y) && (y <= Y / 2)) {
        all_pixels.push([pixelX + x, pixelY + y])
      }
      if ((x === y) || ((x < 0) && (x === -y)) || ((x > 0) && (x === 1 - y))) {
        t = dx;
        dx = -dy;
        dy = t;
      }
      x += dx;
      y += dy;
    }
    return all_pixels
  }

  /**
   * is attributes in object of an array ?
   * @param table array
   * @param attribute string
   * @param value any
   * @return number
   */
  public static isAttributesInObjectOfAnArray(table: Array<any>, attribute: string, value: any): number {
    var position: number;
    for (let index = 0; index < table.length; index++) {
      const element = table[index];
      if (element[attribute] == value) {
        position = index
      }
    }
    return position
  }

  /**
* Covert a color from hex to rgb
* @param hex string
* @return  {r: number, g: number, b: number }
*/
  static hexToRgb(hex: string): { r: number, g: number, b: number } {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}
