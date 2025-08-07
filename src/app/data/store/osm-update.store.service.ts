import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject, from, of, take, map } from 'rxjs';

import { CustomVectorSource } from '../../../helper/carto.helper';
import { Box3, Vector2 } from 'three';
import { LEVEL_HEIGHT } from '../../processing/building/building-params';
import { Geometry } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import { Feature } from 'ol';
export interface OsmFeatureToInUpdate {
    osm_id: number,
    osm_type: "way" | "relation",
    changes: object,
}



@Injectable({
    providedIn: 'root'
})
export class OSMUpdateStoreService {
    private isOsmBuildingUpdateEnabled$ = new BehaviorSubject<boolean>(false)
    private osmFeaturesInUpdate$ = new BehaviorSubject<OsmFeatureToInUpdate[]>([])
    private ignoredFeatures$ = new BehaviorSubject<number[]>([])

    closestFeatureToUpdateListener$ = new BehaviorSubject<Coordinate>(null)
    closestFeatureToUpdateReciever$ = new BehaviorSubject<Feature | null>(null)

    constructor(
    ) {
        if (this.osmFeaturesInUpdate.length > 0 && localStorage.getItem('osmFeaturesInUpdate')) {
            // this.osmFeaturesInUpdate = JSON.parse(localStorage.getItem('osmFeaturesInUpdate'))
        }
    }

    get isOsmBuildingUpdateEnabled() {
        return this.isOsmBuildingUpdateEnabled$.value
    }

    get isOsmBuildingUpdateEnabledObservable() {
        return this.isOsmBuildingUpdateEnabled$.asObservable()
    }

    get osmFeaturesInUpdate() {
        return this.osmFeaturesInUpdate$.value
    }
    get ignoredFeatures() {
        return this.ignoredFeatures$.value
    }

    get osmFeaturesInUpdateObservable() {
        return this.osmFeaturesInUpdate$.asObservable()
    }

    storeIgnoredFeature(osm_id: number) {
        const value = this.ignoredFeatures$.value
        value.push(osm_id)
        this.ignoredFeatures$.next(value)
    }

    storeFeatureToInUpdate(osmFeatureToInUpdate: OsmFeatureToInUpdate) {
        const value = this.osmFeaturesInUpdate$.value
        value.push(osmFeatureToInUpdate)
        this.osmFeaturesInUpdate$.next(value)
        // localStorage.setItem('osmFeaturesInUpdate', JSON.stringify(this.osmFeaturesInUpdate))
    }

    getNextFeatureToUpdate(coordinate: Coordinate): Observable<Feature<Geometry> | null> {
        this.closestFeatureToUpdateListener$.next(coordinate)
        return this.closestFeatureToUpdateReciever$.pipe(
            take(1),
        )
    }
    clearOsmFeaturesInUpdate() {
        this.osmFeaturesInUpdate$.next([])
        // localStorage.removeItem('osmFeaturesInUpdate')
    }
    enableOsmBuildingUpdate() {
        this.isOsmBuildingUpdateEnabled$.next(true)
    }
    disableOsmBuildingUpdate() {
        this.isOsmBuildingUpdateEnabled$.next(false)
        this.clearOsmFeaturesInUpdate()
    }
}