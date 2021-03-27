import { Map, VectorProvider } from "../../type/type";

export interface AdminBoundary {
    admin_boundary_id:number
    name:string
    vector:VectorProvider
}

export interface Parameter{
    parameter_id:number
    map:Map,
    extent:VectorProvider
    extent_pk:number
    adminBoundary:AdminBoundary[]
}