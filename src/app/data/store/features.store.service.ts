import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject, from, of, Subject, filter, debounceTime } from 'rxjs';

import Flatbush from 'flatbush';
import { CustomVectorSource } from '../../../helper/carto.helper';
import { Box3, Vector2 } from 'three';
import { LEVEL_HEIGHT } from '../../processing/building/building-params';
import { Geometry } from 'ol/geom';
import { RequestReplyClient, RequestReplyServer, ReqMsg, ResMsg } from '../../../helper/request-reply';
import Vec2 from '../../processing/math/vector2';
import { Feature } from '../../ol-module';
import { PackedTiles } from '../../processing/building-elevation';
import { Extent } from 'ol/extent';

export interface OsmFeatureToChange {
    osm_id: number,
    changes: object,
    geometry: Geometry
}



@Injectable({
    providedIn: 'root'
})
export class FeaturesStoreService {

    private newBuildingHieghtLoaded$ = new Subject<void>();

    buildingsToHide$: BehaviorSubject<Map<number, string>> = new BehaviorSubject<Map<number, string>>(new Map());
    latestChangedBuildingToHide$: BehaviorSubject<string> = new BehaviorSubject<string>(undefined);
    // Reload a building tile of this feature
    reloadBuilding$: BehaviorSubject<OsmFeatureToChange> = new BehaviorSubject<OsmFeatureToChange>(undefined);
    // Update a building feature
    private updateBuildingFeature$: BehaviorSubject<OsmFeatureToChange> = new BehaviorSubject<OsmFeatureToChange>(undefined);
    // Map of layer add as a vector layer using Three.GROUP with his vectorSource
    private layersVectorSources$: BehaviorSubject<Map<number | string, CustomVectorSource>> = new BehaviorSubject<Map<number, CustomVectorSource>>(new Map());

    private customVectorSource$: BehaviorSubject<Map<number | string, (featureId: number | string) => Feature<Geometry>>> = new BehaviorSubject<Map<number | string, (featureId: number | string) => Feature<Geometry>>>(new Map());

    private buildingHeightFlatBushIndex$: BehaviorSubject<PackedTiles> = new BehaviorSubject<PackedTiles>(null);
    private tileFlatIndexBuildingHeight$: BehaviorSubject<Map<string, Map<number, number>>> = new BehaviorSubject<Map<string, Map<number, number>>>(new Map<string, Map<number, number>>());
    private newBuildingsExtentsLoaded$: BehaviorSubject<Array<Extent>> = new BehaviorSubject<Array<Extent>>([]);
    // Send and retrieve a building height
    private readonly sendRetrieveBuildingHeight$ = new Subject<ReqMsg<Vec2> | ResMsg<number>>();

    sendRetrieveBuildingHeightEmitter$ = new RequestReplyServer<Vec2, number>(
        this.sendRetrieveBuildingHeight$.pipe(filter((m): m is ReqMsg<Vec2> => m.type === 'req')),
        { next: (msg) => this.sendRetrieveBuildingHeight$.next(msg) }
    );


    private readonly sendRetrieveBuildingHeightListener$ = new RequestReplyClient<Vec2, number>(
        { next: (msg) => this.sendRetrieveBuildingHeight$.next(msg) },                // sink req
        this.sendRetrieveBuildingHeight$.pipe(filter((m): m is ResMsg<number> => m.type === 'res')) // responses$
    );



    //
    constructor() {

    }

    get newBuildingsExtentsLoaded() {
        return this.newBuildingsExtentsLoaded$.value
    }
    get tileFlatIndexBuildingHeight() {
        return this.tileFlatIndexBuildingHeight$.value
    }
    set tileFlatIndexBuildingHeight(value: Map<string, Map<number, number>>) {
        this.tileFlatIndexBuildingHeight$.next(value)
    }

    get buildingHeightFlatBushIndex() {
        return this.buildingHeightFlatBushIndex$.value

    }
    set buildingHeightFlatBushIndex(value: PackedTiles) {

        this.buildingHeightFlatBushIndex$.next(value)
    }
    get newBuildingHieghtLoaded() {
        return this.newBuildingHieghtLoaded$.pipe(debounceTime(1000))
    }
    set newBuildingHieghtLoaded(_) {
        this.newBuildingHieghtLoaded$.next()
    }

    get updateBuildingFeature() {
        return this.updateBuildingFeature$.asObservable()
    }

    addNewBuildingExtentLoaded(extent: Extent) {
        this.newBuildingsExtentsLoaded$.next([...this.newBuildingsExtentsLoaded$.value, extent])
    }
    clearNewBuildingExtentLoaded() {
        this.newBuildingsExtentsLoaded$.next([])
    }

    changeBuildingFeature(osmFeatureToChange: OsmFeatureToChange) {
        this.updateBuildingFeature$.next(osmFeatureToChange)
    }

    getBuildingsToHide() {
        const stored = localStorage.getItem('buildingsToHide');
        let restoredMap: Map<number, string> = new Map();
        if (stored) {
            const entries = JSON.parse(stored);
            restoredMap = new Map(entries);
        }
        return restoredMap
    }

    setBuildingsToHide(tile_key: string, osmId: number) {
        const oldValue = this.getBuildingsToHide()
        oldValue.set(osmId, tile_key)
        this.buildingsToHide$.next(oldValue)
        localStorage.setItem('buildingsToHide', JSON.stringify(Array.from(oldValue.entries())))
        this.latestChangedBuildingToHide$.next(tile_key)
    }

    removeBuildingsToHide(osmId: number) {
        const oldValue = this.getBuildingsToHide()
        const tile_key = oldValue.get(osmId)
        if (tile_key) {
            oldValue.delete(osmId)
            this.buildingsToHide$.next(oldValue)
            localStorage.setItem('buildingsToHide', JSON.stringify(Array.from(oldValue.entries())))
            this.latestChangedBuildingToHide$.next(tile_key)
        }
    }
    RemoveAllBuildingsToHide() {
        const oldValue = this.getBuildingsToHide()
        const keys = Array.from(oldValue.values())
        oldValue.clear()
        this.buildingsToHide$.next(oldValue)
        localStorage.setItem('buildingsToHide', JSON.stringify(Array.from(oldValue.entries())))
        for (const tile_key of keys) {
            this.latestChangedBuildingToHide$.next(tile_key)
        }
    }


    async getBuildingHeightAtPoint(point: Vec2) {
        return await this.sendRetrieveBuildingHeightListener$.ask(point);
    }

    addCustomVectorSource(couche_id: number | string, customVectorSource: (featureId: number | string) => Feature<Geometry>) {
        const customVectorSourceMap = this.customVectorSource$.getValue()
        customVectorSourceMap.set(couche_id, customVectorSource)
        this.customVectorSource$.next(customVectorSourceMap)
    }

    removeCustomVectorSource(couche_id: number | string) {
        const customVectorSourceMap = this.customVectorSource$.getValue()
        if (customVectorSourceMap.has(couche_id)) {
            customVectorSourceMap.delete(couche_id)
            this.customVectorSource$.next(customVectorSourceMap)
        }
    }

    addLayerVectorSource(couche_id: number | string, layer_vector_source: CustomVectorSource) {
        const layers_vector_sources_map = this.layersVectorSources$.getValue()
        layers_vector_sources_map.set(couche_id, layer_vector_source)
        this.layersVectorSources$.next(layers_vector_sources_map)
    }

    removeLayerVectorSource(couche_id: number | string) {
        const layers_vector_sources_map = this.layersVectorSources$.getValue()
        if (layers_vector_sources_map.has(couche_id)) {
            layers_vector_sources_map.delete(couche_id)
            this.layersVectorSources$.next(layers_vector_sources_map)
        }
    }

    getLayerVectorSource(couche_id: number | string) {
        const layers_vector_sources_map = this.layersVectorSources$.getValue()
        return layers_vector_sources_map.get(couche_id)
    }

    layersVectorSourcesMap() {
        return this.layersVectorSources$.getValue()
    }

    reloadBuildingFeature(osm_id: number, changes: object, geometry: Geometry) {

        this.reloadBuilding$.next({ osm_id, changes, geometry })
    }

    getFeatureFromLayer(couche_id: number | string, featureId: number): Feature<Geometry> | null {
        const layer = this.getLayerVectorSource(couche_id)
        if (layer) {
            return layer.getFeatureByUid(featureId.toString())
        }
        const customVectorSource = this.customVectorSource$.getValue().get(couche_id)
        if (customVectorSource) {
            return customVectorSource(featureId)
        }
        return null
    }




}