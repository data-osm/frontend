import BaseLayer from "ol/layer/Base";
import { Source } from "ol/source";
import { EventTypes, unByKey } from "ol/Observable";
import { Observable, Subscriber } from "rxjs";
import { Collection, Map, VectorSourceEvent } from "../../ol-module";
import BaseEvent from "ol/events/Event";
import { VectorSourceEventTypes } from "ol/source/VectorEventType";

export function fromOpenLayerEvent<T extends BaseEvent | VectorSourceEventTypes>(element: BaseLayer | Collection<BaseLayer> | Source | any, eventName: EventTypes | VectorSourceEventTypes): Observable<T> {

  return new Observable((observer: Subscriber<T>) => {
    const handler: (e: BaseEvent | VectorSourceEventTypes) => unknown = (e: T) => observer.next(e);

    let eventKey = element.on(eventName, handler)

    return () => {
      unByKey(eventKey)
    }
  });
}