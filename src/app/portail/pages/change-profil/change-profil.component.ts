import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { Router } from '@angular/router';
import { EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { MapsService } from '../../../data/services/maps.service';
import { ParametersService } from '../../../data/services/parameters.service';
import { Map } from '../../../type/type';

@Component({
  selector: 'app-change-profil',
  templateUrl: './change-profil.component.html',
  styleUrls: ['./change-profil.component.scss']
})
export class ChangeProfilComponent implements OnInit {

  public onInitInstance:()=>void
  profils$:Observable<Map[]>
  map_id = this.parametersService.map_id

  constructor(
    public parametersService: ParametersService,
    public mapsService: MapsService,
    public dialogRef: MatDialogRef<ChangeProfilComponent>,
    public router:Router
  ) {
    const onInit:Subject<void> = new ReplaySubject<void>()
    this.onInitInstance =()=>{
      onInit.next()
    }

    this.profils$ = onInit.pipe(
      switchMap(()=>{
        return this.mapsService.getAllMaps().pipe(
          catchError((error: HttpErrorResponse) => {
            alert('An error occured when retrieving profils')
            this.dialogRef.close()
            return EMPTY
          }),
        )
      })
    )

   }

  changeProfil(map_id:number){
    this.router.navigateByUrl('/map?profil='+map_id).then(()=>{
      window.location.reload();
    })
  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  close(){
    this.dialogRef.close(false)
  }

}
