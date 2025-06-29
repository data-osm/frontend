import { HttpClient, HttpResponse } from "@angular/common/http";
import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import { from, map, Observable } from "rxjs";
import { Box3, Vector3 } from "three";
import { environment } from "../../../environments/environment";
import { AppInjector } from "../../../helper/app-injector.helper";

const tempBox = new Box3();
const tempVec3 = new Vector3();
export interface RvtToIFCStatus {
    "id": string
    "status": "done" | "failed" | "pending"
    "created_at": string
    "started_at": string
    "finished_at": string
    "download_url": string
}
export default class ImportIfc {
    private fragmentIfcLoader: OBC.IfcLoader
    http: HttpClient = AppInjector.get(HttpClient);
    constructor(

    ) {
    }
    async initialize() {
        const components = new OBC.Components();
        components.init();
        this.fragmentIfcLoader = components.get(OBC.IfcLoader);
        // fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
        await this.fragmentIfcLoader.setup()
    }

    load(ifcBuffer: Uint8Array): Promise<FRAGS.FragmentsGroup> {
        return this.fragmentIfcLoader.load(ifcBuffer).then((ifc) => {

            return ifc
        })
    }

    convertRvtToIFC(data: FormData): Observable<{
        "message": string,
        "id": string
    }> {
        return this.http.post<{
            "message": string,
            "id": string
        }>(environment.revitURl + '/convert', data).pipe(
            // map((value: HttpResponse<any>) => { return value.body })
        )
    }

    getConversionRvtToIfcStatus(id: string): Observable<RvtToIFCStatus> {
        return this.http.get<RvtToIFCStatus>(environment.revitURl + '/status?id=' + id)
    }

    downloadFile(download_url: string): Observable<Blob> {
        return this.http.get(environment.revitURl + download_url, { responseType: 'blob' })
    }
}