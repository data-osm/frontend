import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, combineLatest, EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { CustomStyle, Icon, VectorProvider, AddStyle } from '../../../../../type/type';
import { StyleService } from '../../../../administration/service/style.service'
import { VectorProviderService } from '../../../../administration/service/vector-provider.service'
import { ClusterComponent } from '../cluster/cluster.component';
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
  
  nameStyle = new FormControl(this.data.name,[Validators.required])

  provider$:Observable<VectorProvider>
  customStyles$:Observable<CustomStyle[]>

  private readonly notifier: NotifierService;
  formAddStyle: FormGroup 

  @ViewChild(QmlComponent) qmlComponent:QmlComponent
  @ViewChild(ClusterComponent) clusterComponent:ClusterComponent
  

  constructor(
    public dialogRef: MatDialogRef<AddStyleComponent>,
    private formBuilder: FormBuilder,
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
