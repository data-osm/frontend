import { BatchedMesh, DataTexture, FloatType, Group, IntType, Material, Mesh, Object3DEventMap, PerspectiveCamera, RGBAFormat, ShaderMaterial } from "three";
import { CustomInstancedBufferGeometry, PointMesh } from "../custom-mesh";
import { Extent } from "ol/extent";

export abstract class AbstractPointsTile extends Group {
    readonly isFeatureTile = true;
    readonly type = 'PointTile';
    couche_id: number
    key: string

    abstract addPointMesh(geometry: CustomInstancedBufferGeometry, material: ShaderMaterial, camera: PerspectiveCamera): void
    abstract addStickMesh(geometry: CustomInstancedBufferGeometry, material: ShaderMaterial): void
    abstract dispose(): void
    abstract afterCameraUpdate(camera: PerspectiveCamera): void
}



export class PointsTile extends AbstractPointsTile {
    // frustumCulled: boolean = false
    readonly isFeatureTile = true;
    readonly type = 'PointTile';
    extent: Extent
    couche_id: number
    key: string
    osmIdsFeatureIndex: Map<number, number>
    featureIndexOsmId: Map<number, number>

    meshes: {
        pointMesh: PointMesh,
    } = {
            pointMesh: undefined,
        }

    stickMeshes: {
        stickMesh: Mesh<CustomInstancedBufferGeometry, ShaderMaterial, Object3DEventMap>
    } = {
            stickMesh: undefined
        }

    // pointMesh: PointMesh
    // stickMesh: Mesh<CustomInstancedBufferGeometry, ShaderMaterial, Object3DEventMap>

    addPointMesh(geometry: CustomInstancedBufferGeometry, material: ShaderMaterial, camera: PerspectiveCamera) {
        for (const key in this.meshes) {
            this.meshes[key] = new PointMesh(geometry.clone(), material.clone(), camera)
            this.meshes[key].updateMatrixWorld()
            this.meshes[key].updateMatrix()
            this.add(this.meshes[key])
            this.meshes[key].userData.type = "pointMesh"
            this.meshes[key].userData.couche_id = this.couche_id
            // as the mesh have multiple features, frustum will not hide some feature or not. 
            //To not have to compute the bounding box every time for nothing, we deactivate the frustrum
            this.meshes[key].frustumCulled = false
        }
    }

    addStickMesh(geometry: CustomInstancedBufferGeometry, material: ShaderMaterial) {
        for (const key in this.stickMeshes) {
            this.stickMeshes[key] = new Mesh(geometry.clone(), material.clone())
            this.stickMeshes[key].updateMatrixWorld()
            this.stickMeshes[key].updateMatrix()
            this.add(this.stickMeshes[key])
            this.stickMeshes[key].userData.type = "stickMesh"
            this.stickMeshes[key].userData.couche_id = this.couche_id
            // as the mesh have multiple features, frustum will not hide some feature or not. 
            //To not have to compute the bounding box every time for nothing, we deactivate the frustrum
            this.stickMeshes[key].frustumCulled = false
        }

        // this.stickMesh = new Mesh(geometry, material)
        // this.stickMesh.updateMatrixWorld()
        // this.stickMesh.updateMatrix()
        // this.add(this.stickMesh)
        // this.stickMesh.userData.type = "stickMesh"
        // this.pointMesh.userData.couche_id = this.couche_id
        // // as the mesh have multiple features, frustum will not hide some feature or not. 
        // //To not have to compute the bounding box every time for nothing, we deactivate the frustrum
        // this.stickMesh.frustumCulled = false
    }
    afterCameraUpdate(camera: PerspectiveCamera) {
        for (const key in this.meshes) {
            this.meshes[key].material.uniforms.quaternion.value.copy(camera.quaternion).invert()
        }

    }

    dispose() {
        for (const key in this.meshes) {
            this.meshes[key].material.dispose()
            this.meshes[key].material.dispose()
            this.meshes[key].geometry.dispose()
            this.meshes[key].clear()
        }

        for (const key in this.stickMeshes) {
            this.stickMeshes[key].material.dispose()
            this.stickMeshes[key].material.dispose()
            this.stickMeshes[key].geometry.dispose()
            this.stickMeshes[key].clear()
        }

        this.clear()
    }

}
