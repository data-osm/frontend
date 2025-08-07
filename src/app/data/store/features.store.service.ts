import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';

import Flatbush from 'flatbush';
import { CustomVectorSource } from '../../../helper/carto.helper';
import { Box3, Vector2 } from 'three';
import { LEVEL_HEIGHT } from '../../processing/building/building-params';
import { Geometry } from 'ol/geom';

export interface OsmFeatureToChange {
    osm_id: number,
    changes: object,
    geometry: Geometry
}



@Injectable({
    providedIn: 'root'
})
export class FeaturesStoreService {

    // Map of Index ID of a building in FlatBush index and his corresponding height
    buildingsHeights$: BehaviorSubject<Map<number, number>> = new BehaviorSubject<Map<number, number>>(new Map());
    // Index for fast searching building around a position
    buildingsIndex$ = new BehaviorSubject<Flatbush>(new Flatbush(1));
    buildingsToHide$: BehaviorSubject<Map<number, string>> = new BehaviorSubject<Map<number, string>>(new Map());
    latestChangedBuildingToHide$: BehaviorSubject<string> = new BehaviorSubject<string>(undefined);
    // Reload a building tile of this feature
    reloadBuilding$: BehaviorSubject<OsmFeatureToChange> = new BehaviorSubject<OsmFeatureToChange>(undefined);
    // Update a building feature
    private updateBuildingFeature$: BehaviorSubject<OsmFeatureToChange> = new BehaviorSubject<OsmFeatureToChange>(undefined);
    // Map of layer add as a vector layer using Three.GROUP with his vectorSource
    private layersVectorSources$: BehaviorSubject<Map<number | string, CustomVectorSource>> = new BehaviorSubject<Map<number, CustomVectorSource>>(new Map());

    //
    constructor() {

    }

    get updateBuildingFeature() {
        return this.updateBuildingFeature$.asObservable()
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

    getBuildingHeights() {
        return this.buildingsHeights$.getValue()
    }

    getBuildingsIndex() {
        return this.buildingsIndex$.getValue()
    }

    getBuildingHeightAtPoint(point: Vector2) {
        if (this.buildingsHeights$.getValue().size == 0) {
            return LEVEL_HEIGHT
        }

        const buildingsIntersecting = this.buildingsIndex$.getValue().neighbors(
            point.x,
            point.y,
            2,
        )
        const buildingHeightAtPoint = Math.max(...buildingsIntersecting.map((index) => this.buildingsHeights$.getValue().get(index)))
        if (buildingHeightAtPoint) {
            // a bit higher to see the building + the stick
            return buildingHeightAtPoint + 10
        } else {
            return 10
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




}