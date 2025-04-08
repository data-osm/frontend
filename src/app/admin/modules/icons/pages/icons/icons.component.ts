import { Component, ElementRef, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, EMPTY, merge, Observable, of, ReplaySubject, Subject, throwError } from 'rxjs';
import { catchError } from 'rxjs/internal/operators/catchError';
import { filter, finalize, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { ManageCompHelper } from '../../../../../../helper/manage-comp.helper'
import { Icon } from '../../../../../type/type';
import { IconService } from '../../../../administration/service/icon.service'
import { AddIconComponent } from '../add-icon/add-icon.component';
import { UpdateIconComponent } from '../update-icon/update-icon.component';
@Component({
  selector: 'app-icons',
  templateUrl: './icons.component.html',
  styleUrls: ['./icons.component.scss']
})
/**
 * comp icon handle
 */
export class IconsComponent implements OnInit {

  onInitInstance:()=>void
  onAddtInstance:()=>void
  onUpdatetInstance:(icon:Icon)=>void
  onDeletetInstance:(icon:Icon)=>void

  private readonly notifier: NotifierService;
  url_prefix = environment.backend
  onIconSelect:Subject<Icon> = new Subject<Icon>()
  searchResultIcon:Observable<Icon[]> 
  searchIconForm: UntypedFormGroup = this.fb.group({})

  loading_icon:boolean = true

  objectKeys = Object

    /**
   * list of icons, group by category
   */
  public iconList$: Observable<Array<{[key: string]: Icon[]}>> 

  constructor(
    public manageCompHelper: ManageCompHelper,
    public IconService: IconService,
    notifierService: NotifierService,
    public fb: UntypedFormBuilder,
    public dialog:MatDialog,
    public translate: TranslateService,
  ) {
    this.notifier = notifierService;

    let searchControl = new UntypedFormControl(null, Validators.min(3))
    this.searchResultIcon = searchControl.valueChanges.pipe(
      filter((search_word) => typeof search_word === 'string' &&  search_word.length > 2),
      catchError((err) => of([]) ),
      switchMap((search_word) => {
        return this.IconService.searchIcon(search_word).pipe(
          catchError( (err)=> { this.notifier.notify("error", "An error occured when searching icons"); return EMPTY }),
        )
      })
    )
     
    this.searchIconForm.addControl('search_word', searchControl)

    
    const onInit:Subject<void> =new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    const onAdd:Subject<void> =new Subject<void>()
    this.onAddtInstance = ()=>{
      onAdd.next()
    }

    const onUpdate:Subject<Icon> =new Subject<Icon>()
    this.onUpdatetInstance = (icon:Icon)=>{
      onUpdate.next(icon)
    }

    const onDelete:Subject<Icon> =new Subject<Icon>()
    this.onDeletetInstance = (icon:Icon)=>{
      onDelete.next(icon)
    }

    this.iconList$ = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.IconService.getIconsGroupByCategory().pipe(
            tap(()=>{this.loading_icon =false}),
            catchError( (err)=> { this.notifier.notify("error", "An error occured when loading icons"); this.loading_icon =false ;return EMPTY }),
          )
        })
      ),
      onAdd.pipe(
        switchMap(()=>{
          return this.dialog.open<AddIconComponent,any, Icon[]|boolean>(AddIconComponent,{minWidth: 400,}).afterClosed().pipe(
            filter(result =>result instanceof Array),
            tap(()=>{this.loading_icon =true}),
            switchMap((icons)=>{
              return this.IconService.getIconsGroupByCategory().pipe(
                tap(()=>{
                  this.loading_icon =false; 
                  this.onIconSelect.next(icons[0])
                  setTimeout(()=>{
                    this.onIconSelect.next(icons[0])
                  }, 500)
                }),
                catchError( (err)=> { this.notifier.notify("error", "An error occured when loading icons"); this.loading_icon =false ;return EMPTY }),
              )
            })
          )
        })
      ),
      onUpdate.pipe(
        switchMap((icon)=>{
          return this.dialog.open(UpdateIconComponent,{data:icon,minWidth:400}).afterClosed().pipe(
            filter(result =>result),
            tap(()=>{this.loading_icon =true}),
            switchMap(()=>{
              return this.IconService.getIconsGroupByCategory().pipe(
                tap(()=>{this.loading_icon =false}),
                catchError( (err)=> { this.notifier.notify("error", "An error occured when loading icons"); this.loading_icon =false ;return EMPTY }),
              )
            })
          )
        })
      ),
      onDelete.pipe(
        switchMap((icon)=>{
            return  this.manageCompHelper.openConfirmationDialog([],{
              confirmationTitle: "Supprimer une icone", 
              confirmationExplanation: "Supprimer l'icone "+ icon.name +' ?',
              cancelText: this.translate.instant('cancel'),
              confirmText: this.translate.instant('delete'),
            }).pipe(
              filter(resultConfirmation => resultConfirmation),
              tap(()=>{this.loading_icon =true}),
              switchMap(()=>{
                return this.IconService.deleteIcon(icon.icon_id).pipe(
                  catchError( (err)=> { this.notifier.notify("error", "An error occured when deleting icons");return EMPTY }),
                  switchMap(()=>{
                    return this.IconService.getIconsGroupByCategory().pipe(
                      tap(()=>{this.loading_icon =false}),
                      catchError( (err)=> { this.notifier.notify("error", "An error occured when loading icons"); this.loading_icon =false ;return EMPTY }),
                    )
                  })
                )
               
              })
            )
        })
      )
    )

  }

  ngOnInit(): void {
    this.onInitInstance()
  }

  displaySelectedIcon(icon:Icon):string{
    if (icon) {
      return icon.name +', '+icon.category
    }
  }

}
