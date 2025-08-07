import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { OsmDataRequest } from '../../services/request';
import { tap } from 'rxjs';

export interface OsmUserInfo {
  display_name: string,
}

export interface UpdateOSMInfo {
  osm_id: number
  rnb: string
  osm_type: "way" | "relation"
  diff_rnb?: string
}

@Injectable({
  providedIn: 'root'
})
export class OsmService extends OsmDataRequest {

  constructor(
    private http_: HttpClient,
  ) {
    super(http_)
  }

  getOsmUserInfo() {
    let state_relay = ""
    if (localStorage.getItem("state_relay") != null) {
      state_relay = "?state_relay=" + localStorage.getItem("state_relay")
    }
    return this.safeGet<OsmUserInfo>('/api/account/osm-auth/info' + state_relay).pipe(
      tap(() => {
        localStorage.removeItem("state_relay")
      })
    )
  }

  getAuthStateRelay() {
    return this.safeGet<{ state_relay: string }>('/api/account/auth-state-relay')
  }

  updateOSMFeature(osmFeature: UpdateOSMInfo[]) {
    return this.safePost('/api/osm/update-osm-feature', osmFeature)
  }
}
