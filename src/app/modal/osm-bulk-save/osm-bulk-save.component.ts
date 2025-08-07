import { Component } from '@angular/core';
import { OSMUpdateStoreService } from '../../data/store/osm-update.store.service';
import { OsmService, UpdateOSMInfo } from '../../data/services/osm.service';
import { catchError, EMPTY, take, tap } from 'rxjs';
import { NotifierService } from 'angular-notifier';
import { MatDialogRef } from '@angular/material/dialog';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DescriptiveSheetComponent } from '../../portail/pages/descriptive-sheet/descriptive-sheet.component';
@Component({
  selector: 'app-osm-bulk-save',
  templateUrl: './osm-bulk-save.component.html',
  styleUrls: ['./osm-bulk-save.component.scss']
})
export class OsmBulkSaveComponent {
  _loading = false
  private readonly notifier: NotifierService;
  bulkSave: () => void
  constructor(
    public osmUpdateStoreService: OSMUpdateStoreService,
    private osmService: OsmService,
    notifierService: NotifierService,
    public dialogRef: MatDialogRef<OsmBulkSaveComponent>,
    dialog: MatDialog
  ) {
    this.notifier = notifierService

    this.bulkSave = () => {
      this._loading = true
      const osmFeaturesToUpdate = this.osmUpdateStoreService.osmFeaturesInUpdate.map((osmFeat) => {
        const osmFeatureToUpdate: UpdateOSMInfo = {
          osm_id: Math.abs(osmFeat.osm_id),
          osm_type: osmFeat.osm_type,
          rnb: osmFeat.changes["rnb"],
          diff_rnb: osmFeat.changes["diff_rnb"]
        }
        return osmFeatureToUpdate

      })

      this.osmService.updateOSMFeature(osmFeaturesToUpdate).pipe(
        tap(() => {
          this.notifier.notify('success', 'Modifications sauvegardées avec succès')
          dialog.openDialogs.filter(dialog => {
            return (
              dialog.componentInstance instanceof DescriptiveSheetComponent
            )
          }).map(dialog => {
            dialog.close()
          })
          setTimeout(() => {
            this._loading = false
            osmUpdateStoreService.clearOsmFeaturesInUpdate()
            dialogRef.close()

          }, 2000);


        }),
        catchError((error) => {
          this._loading = false
          if (error.error && typeof error.error === 'string') {
            this.notifier.notify('error', error.error)
          } else if (error.error && typeof error.error === 'object') {
            Object.keys(error.error).forEach(key => {
              let message = error.error[key]
              if (key != "__all__") {
                message += key + " : " + message
              }
              this.notifier.notify('error', message)
            })
          }
          return EMPTY
        }),
        take(1),
      ).subscribe(() => {
      })

    }
  }
}
