import { unByKey } from "ol/Observable";
import { Observable, Subscriber } from "rxjs";

export function fromOpenLayerEvent<T>(element:any, eventName:string):Observable<T> {
   
    return new Observable( (observer:Subscriber<T>)  => {
      const handler = (e:T) => observer.next(e);
  
      let eventKey = element.on(eventName,handler)
  
      return () => {
        unByKey(eventKey)
      }
    });
  }