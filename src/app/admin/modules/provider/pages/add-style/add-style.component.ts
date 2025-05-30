import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, combineLatest, EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PolygonSimpleComponent } from '../ polygon-simple/polygon-simple.component';
import { CustomStyle, Icon, VectorProvider, AddStyle } from '../../../../../type/type';
import { StyleService } from '../../../../administration/service/style.service'
import { VectorProviderService } from '../../../../administration/service/vector-provider.service'
import { ClusterComponent } from '../cluster/cluster.component';
import { LineSimpleComponent } from '../line-simple/line-simple.component';
import { PointIconSimpleComponent } from '../point-icon-simple/point-icon-simple.component';
import { QmlComponent } from '../qml/qml.component';


@Component({
  selector: 'app-add-style',
  templateUrl: './add-style.component.html',
  styleUrls: ['./add-style.component.scss']
})
/**
 * add a new style to vector provider
 */
export class AddStyleComponent implements OnInit, OnDestroy {
  
  /**
   * add the instance, if success, exit dialog 
   */
  onAddInstance:()=>void
  onInitInstance:()=>void


  /**
   * is the comp communicating with server ?
   */
  loading:boolean

  styleType:BehaviorSubject<CustomStyle> = new BehaviorSubject<CustomStyle>(this.data.customStyle)
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  
  nameStyle = new UntypedFormControl(this.data.name,[Validators.required])

  provider$:Observable<VectorProvider>
  customStyles$:Observable<CustomStyle[]>

  private readonly notifier: NotifierService;
  formAddStyle: UntypedFormGroup 

  @ViewChild(QmlComponent) qmlComponent:QmlComponent
  @ViewChild(ClusterComponent) clusterComponent:ClusterComponent
  @ViewChild(PointIconSimpleComponent) pointIconSimpleComponent:PointIconSimpleComponent
  @ViewChild(PolygonSimpleComponent) polygonSimpleComponent:PolygonSimpleComponent
  @ViewChild(LineSimpleComponent) lineSimpleComponent:LineSimpleComponent
  

  constructor(
    public dialogRef: MatDialogRef<AddStyleComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public StyleService:StyleService,
    public VectorProviderService: VectorProviderService,
    private cdRef:ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: AddStyle
  ) { 
    this.notifier = notifierService;

    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    this.provider$ = onInit.pipe(
      switchMap(()=>{
        return this.VectorProviderService.getVectorProvider(this.data.provider_vector_id).pipe(
          catchError((value:HttpErrorResponse)=>{
            this.notifier.notify("error", "An error occured while loading the provider")
            this.dialogRef.close(false)
            return EMPTY
          }),
          
        )
      }),
      shareReplay(1)
    )

    this.customStyles$ = onInit.pipe(
      switchMap(()=>{
        return this.StyleService.listCustomStyles().pipe(
          catchError((value:HttpErrorResponse)=>{
            this.notifier.notify("error", "An error occured while loading all custom styles ")
            this.dialogRef.close(false)
            return EMPTY
          }),
        )
      })
    )
  
    
  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  ngAfterViewInit(){
    this.styleType.pipe(
     tap((customStyle)=>{
       if (customStyle == undefined) {
         this.formAddStyle = this.qmlComponent.form
         this.onAddInstance = ()=>{
           this.qmlComponent.onAddInstance()
         }
       }else if (customStyle.fucntion_name==='pointCluster') {
         this.formAddStyle = this.clusterComponent.form
         this.onAddInstance = ()=>{
           this.clusterComponent.onAddInstance()
         }
       }else if (customStyle.fucntion_name==='point_icon_simple') {
        this.formAddStyle = this.pointIconSimpleComponent.form
        this.onAddInstance = ()=>{
          this.pointIconSimpleComponent.onAddInstance()
        }
      }else if (customStyle.fucntion_name==='polygon_simple') {
        this.formAddStyle = this.polygonSimpleComponent.form
        this.onAddInstance = ()=>{
          this.polygonSimpleComponent.onAddInstance()
        }
      }else if (customStyle.fucntion_name==='line_simple') {
        this.formAddStyle = this.lineSimpleComponent.form
        this.onAddInstance = ()=>{
          this.lineSimpleComponent.onAddInstance()
        }
      }
       this.cdRef.detectChanges();

     }),
     takeUntil(this.destroyed$)
   ).subscribe()

 }


 

  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

   /**
   * Change the type of project
   * @param type string
   */
  styleTypeChanged(type:CustomStyle):void{
    this.styleType.next(type)
  }

  close(): void {
    this.dialogRef.close(false);
  }

 

}
