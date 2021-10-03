import { Layer, VectorProvider } from "../../type/type";

export interface CountFeature { count: number, vector: VectorProvider, layer_id: number, layer_name:string }

export interface FeatureToDownload extends CountFeature{
    layer: Layer
}