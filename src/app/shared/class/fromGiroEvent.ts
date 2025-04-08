import BaseLayer from "ol/layer/Base";
import { EventTypes, unByKey } from "ol/Observable";
import { Observable, Subscriber } from "rxjs";
import BaseEvent from "ol/events/Event";

import {
  Map,
  MapEventMap,
  LayerEvents,
  Layer,
  InstanceEvents,
  Instance
} from "../../giro-3d-module"
import { EventDispatcher, EventListener } from "three/src/core/EventDispatcher"


export function fromMapGiroEvent<T extends Extract<keyof MapEventMap, string>>(element: Map, event_name: T): Observable<MapEventMap[T]> {

  return new Observable<MapEventMap[T]>((observer: Subscriber<MapEventMap[T]>) => {
    const handler = (e) => observer.next(e);
    // :EventListener<{}, T, this> 
    // let eventKey = element.on(eventName,handler)
    let eventKey = element.addEventListener(event_name, handler)

    return () => {
      element.removeEventListener(event_name, handler)
    }
  });
}

export function fromInstanceGiroEvent<T extends Extract<keyof InstanceEvents, string>>(element: Instance, event_name: T): Observable<InstanceEvents[T]> {

  return new Observable<InstanceEvents[T]>((observer: Subscriber<InstanceEvents[T]>) => {
    const handler = (e) => observer.next(e);
    // :EventListener<{}, T, this> 
    // let eventKey = element.on(eventName,handler)
    let eventKey = element.addEventListener(event_name, handler)

    return () => {
      element.removeEventListener(event_name, handler)
    }
  });
}

export function fromLayerGiroEvent<T extends Extract<keyof LayerEvents, string>>(element: Layer, event_name: T): Observable<LayerEvents[T]> {

  return new Observable<LayerEvents[T]>((observer: Subscriber<LayerEvents[T]>) => {
    const handler = (e) => observer.next(e);
    // :EventListener<{}, T, this> 
    // let eventKey = element.on(eventName,handler)
    let eventKey = element.addEventListener(event_name, handler)

    return () => {
      element.removeEventListener(event_name, handler)
    }
  });
}