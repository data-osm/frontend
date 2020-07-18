import {
  Feature,
} from '../app/ol-module';

/**
* Some functions to handle data
*
**/
export class manageDataHelper {

  /**
   * generate random id
   * @return string
   */
  public static makeid():string{
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
    }
}
