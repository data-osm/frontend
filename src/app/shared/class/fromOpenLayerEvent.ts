import BaseLayer from "ol/layer/Base";
import { unByKey } from "ol/Observable";
import { Observable, Subscriber } from "rxjs";
import { Collection, Map } from "../../ol-module";

export function fromOpenLayerEvent<T>(element:BaseLayer|Collection<BaseLayer>|Map, eventName:string):Observable<T> {
   
    return new Observable( (observer:Subscriber<T>)  => {
      const handler = (e:T) => observer.next(e);
  
      let eventKey = element.on(eventName,handler)
  
      return () => {
        unByKey(eventKey)
      }
    });
  }