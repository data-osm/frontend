import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject, from, of } from 'rxjs';

import Flatbush from 'flatbush';
import { CustomVectorSource } from '../../../helper/carto.helper';
import { Box3, Vector2 } from 'three';
import { LEVEL_HEIGHT } from '../../processing/building/building-params';

@Injectable({
    providedIn: 'root'
})
export class FeaturesStoreService {

    // Map of Index ID of a building in FlatBush index and his corresponding height
    buildingsHeights$: BehaviorSubject<Map<number, number>> = new BehaviorSubject<Map<number, number>>(new Map());
    // Index for fast searching building around a position
    buildingsIndex$ = new BehaviorSubject<Flatbush>(new Flatbush(1));

    // Map of layer add as a vector layer using Three.GROUP with his vectorSource
    private layersVectorSources$: BehaviorSubject<Map<number, CustomVectorSource>> = new BehaviorSubject<Map<number, CustomVectorSource>>(new Map());

    constructor() {

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

    addLayerVectorSource(couche_id: number, layer_vector_source: CustomVectorSource) {
        const layers_vector_sources_map = this.layersVectorSources$.getValue()
        layers_vector_sources_map.set(couche_id, layer_vector_source)
        this.layersVectorSources$.next(layers_vector_sources_map)
    }

    removeLayerVectorSource(couche_id: number) {
        const layers_vector_sources_map = this.layersVectorSources$.getValue()
        if (layers_vector_sources_map.has(couche_id)) {
            layers_vector_sources_map.delete(couche_id)
            this.layersVectorSources$.next(layers_vector_sources_map)
        }
    }

    getLayerVectorSource(couche_id: number) {
        const layers_vector_sources_map = this.layersVectorSources$.getValue()
        return layers_vector_sources_map.get(couche_id)
    }

    layersVectorSourcesMap() {
        return this.layersVectorSources$.getValue()
    }




}