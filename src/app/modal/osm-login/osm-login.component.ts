import { Component } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { environment } from '../../../environments/environment';
import { OsmService } from '../../data/services/osm.service';
import { ReplaySubject, takeUntil, tap } from 'rxjs';


@Component({
  selector: 'app-osm-login',
  templateUrl: './osm-login.component.html',
  styleUrls: ['./osm-login.component.scss']
})

export class OsmLoginComponent {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public dialogRef: MatDialogRef<OsmLoginComponent>,
    private osmService: OsmService,
  ) { }

  onNoClick(): void {
    this.dialogRef.close();
  }

  connectToOsm() {
    this.osmService.getAuthStateRelay().pipe(
      takeUntil(this.destroyed$),
      tap((data) => {
        localStorage.setItem("state_relay", data.state_relay)
        const popup = window.open(environment.osm_auth_base_url + "/api/account/osm-auth?state_relay=" + data.state_relay, '_blank', 'width=500,height=600')
        this.dialogRef.close();
      })
    ).subscribe()

  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
