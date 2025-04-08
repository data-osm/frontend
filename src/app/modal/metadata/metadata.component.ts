import { Component, OnInit, Inject } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { FormBuilder } from '@angular/forms';
import { Layer, Metadata, OsmQuerry, SigFile } from '../../type/type';
import { EMPTY, merge, Observable, ReplaySubject } from 'rxjs';
import { MapsService } from '../../data/services/maps.service';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap, catchError, tap, map, mergeMap, toArray, concatMap } from 'rxjs/operators';
import { NotifierService } from 'angular-notifier';
import { OsmQuerryService } from '../../admin/administration/service/osm-querry.service';
import { SigFileService } from '../../admin/administration/service/sig-file.service';
import { environment } from '../../../environments/environment';

export interface MetaDataInterface {
  metadata
  nom
  url_prefix
  exist:boolean
}


@Component({
  selector: 'app-metadata',
  templateUrl: './metadata.component.html',
  styleUrls: ['./metadata.component.scss']
})
/**
 * Metadata Modal
 */
export class MetadataLayerComponent implements OnInit {
  onInitInstance:()=>void
  metadata$:Observable<Metadata>
  osmQuerry$:Observable<OsmQuerry[]>
  sigFiles$:Observable<SigFile[]>
  environment=environment
  
  constructor(
    public dialogRef: MatDialogRef<MetadataLayerComponent>,
    @Inject(MAT_DIALOG_DATA) public layer: Layer,
    private mapsService: MapsService,
    private osmQuerryService: OsmQuerryService,
    private sigFileService: SigFileService,
    public notifier:NotifierService
  ) { 
console.log(this.layer)
    const onInit:ReplaySubject<void> = new ReplaySubject(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }
    this.metadata$ = onInit.pipe(
      switchMap(()=>{
        console.log(this.layer)
        return this.mapsService.getLayerMetadata(this.layer.layer_id).pipe(
          catchError((error:HttpErrorResponse) => { 
            if (error.status != 404) {
              this.notifier.notify("error", "An error occured while loading metadata ");
            }else{
              // this.notifier.notify("error", " This layer does'nt have a metadata yet ! ");
            }
            return EMPTY 
          })
        )
      })
    )

    this.osmQuerry$  = onInit.pipe(
      map(()=>{
       return this.layer.providers.map((provider)=>{
          return this.osmQuerryService.getOsmQuerry(provider.vp_id).pipe(
            catchError(()=>EMPTY)
          )
        }) 
      }),
      concatMap((value)=>{
        return merge(...value).pipe(toArray())
      }),
      tap((values)=>{
        
      })
    )

    this.sigFiles$  = onInit.pipe(
      map(()=>{
       return this.layer.providers.map((provider)=>{
          return this.sigFileService.getSigFile(provider.vp_id).pipe(
            catchError(()=>EMPTY)
          )
        }) 
      }),
      concatMap((value)=>{
        return merge(...value).pipe(toArray())
      }),
      tap((values)=>{
        
      })
    )


  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
