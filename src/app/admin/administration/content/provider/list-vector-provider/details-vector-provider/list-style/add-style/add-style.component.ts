import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, combineLatest, EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { VectorProvider } from '../../../../../../../../type/type';
import { StyleService } from '../../../../../../service/style.service'
import { VectorProviderService } from '../../../../../../service/vector-provider.service'
import { ClusterComponent } from './cluster/cluster.component';
import { QmlComponent } from './qml/qml.component';

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

  styleType:BehaviorSubject<string> = new BehaviorSubject<string>(null)
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  provider$:Observable<VectorProvider>

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
    @Inject(MAT_DIALOG_DATA) public provider_vector_id: number
  ) { 
    this.notifier = notifierService;

    this.formAddStyle = this.formBuilder.group({
      name: new FormControl(null,[Validators.required]),
      qml_file: new FormControl(null,[Validators.required]),
    })

    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    this.provider$ = onInit.pipe(
      switchMap(()=>{
        return this.VectorProviderService.getVectorProvider(this.provider_vector_id).pipe(
          catchError((value:HttpErrorResponse)=>{
            this.notifier.notify("error", "An error occured while loading the provider")
            this.dialogRef.close(false)
            return EMPTY
          }),
          tap(()=>{this.styleType.next('qml')})
        )
      }),
      shareReplay(1)
    )
  
    
  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  ngAfterViewInit(){
    this.styleType.pipe(
     tap((type)=>{
       if (type ==='qml') {
         this.formAddStyle = this.qmlComponent.form
         this.onAddInstance = ()=>{
           this.qmlComponent.onAddInstance()
         }
       }else if (type==='cluster') {
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
  styleTypeChanged(type:string):void{
    this.styleType.next(type)
  }

  close(): void {
    this.dialogRef.close(false);
  }

 

}
