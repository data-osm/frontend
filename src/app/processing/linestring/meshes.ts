import { Group } from "three";
import { SelectableLineMesh } from "../custom-mesh";

export class LineTile extends Group {
    // frustumCulled: boolean = false
    readonly isFeatureTile = true;
    readonly type = 'LineTile';
    couche_id: number
    key: string

    osmIdsFeatureIndex: Map<number, number>
    featureIndexOsmId: Map<number, number>

    lineMesh: SelectableLineMesh
    // 

    addLineMesh(mesh: SelectableLineMesh) {
        mesh.updateMatrixWorld()
        mesh.updateMatrix()
        this.add(mesh)
        this.lineMesh = mesh
        this.lineMesh.userData.type = "lineMesh"
        this.lineMesh.userData.couche_id = this.couche_id
        // as the mesh have multiple features, frustum will not hide some feature or not. 
        //To not have to compute the bounding box every time for nothing, we deactivate the frustrum
        this.lineMesh.frustumCulled = false
    }

    dispose() {
        this.clear()
    }

}