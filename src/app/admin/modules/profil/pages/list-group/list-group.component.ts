import { Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { Subject, ReplaySubject, Observable, BehaviorSubject, merge, EMPTY } from 'rxjs';
import { takeUntil, filter, switchMap, catchError, tap, shareReplay, map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Group } from '../../../../../type/type';
import { AddGroupComponent } from '../add-group/add-group.component';
import { IconService } from '../../../../administration/service/icon.service';
import { MapsService } from '../../../../../data/services/maps.service'
import {ManageCompHelper} from '../../../../../../helper/manage-comp.helper'
import { SvgIconDirective } from '../../../../../shared/directive/svg-icon.directive';
import { EditGroupComponent } from '../edit-group/edit-group.component';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss']
})
export class ListGroupComponent implements OnInit {

  onAddInstance: () => void
  onUpdateInstance: (group: Group) => void
  onDeleteInstance: (group: Group) => void
  onReorderGroupsInstance: (groups: Group[]) => void
  onSelectGroup:(group:Group) => void

  getGroupSelected:() => Subject<Group>
  environment = environment

  private readonly notifier: NotifierService;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  /**
   * group list of a map
   */
  groups$: Observable<Group[]>

  @ViewChildren(SvgIconDirective) svgIcons: QueryList<SvgIconDirective>
  @ViewChild(CdkDropListGroup) listGroup: CdkDropListGroup<CdkDropList>;
  @ViewChild(CdkDropList) placeholder: CdkDropList;
  

  public target: CdkDropList<any>;
  public source: CdkDropList<any>;
  public sourceIndex: number;
  public phElementIndex: number;
  public insertAfter: boolean;

  constructor(
    public MapsService: MapsService,
    public IconService: IconService,
    public route: ActivatedRoute,
    notifierService: NotifierService,
    public dialog: MatDialog,
    public manageCompHelper:ManageCompHelper,
    public translate: TranslateService,
    public router:Router,
  ) {


    this.target = null;
    this.source = null;

    this.notifier = notifierService;

    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next();
    }

    const onUpdate: Subject<Group> = new Subject<Group>()
    this.onUpdateInstance = (group: Group) => {
      onUpdate.next(group);
    }

    const onReorderGroups: Subject<Group[]> = new Subject<Group[]>()
    this.onReorderGroupsInstance = (groups:Group[])=>{
      onReorderGroups.next(groups)
    }

    const onDelete: Subject<Group> = new Subject<Group>()
    this.onDeleteInstance = (group: Group) => {
      onDelete.next(group);
    }

    const onGroupSelect: Subject<Group> = new ReplaySubject<Group>(1)
    onGroupSelect.pipe(takeUntil(this.destroyed$))
    this.onSelectGroup = (group:Group)=>{
      onGroupSelect.next(group)
    }

    this.getGroupSelected = ()=>{
      return onGroupSelect
    }
    const isGroupLoading:BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)
    this.groups$ = merge(
      this.route.params.pipe(
        filter(() => this.route.snapshot.paramMap.get('id') != undefined),
        switchMap(() => {
          isGroupLoading.next(true)
          return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY }),
            tap(()=>{isGroupLoading.next(false)})
          )
        })
      ),
      onAdd.pipe(
        filter(() => this.route.snapshot.paramMap.get('id') != undefined),
        switchMap(() => {
          this.dialog.closeAll()
          return this.dialog.open(AddGroupComponent, { disableClose: false, width: '90%', maxWidth: '90%', maxHeight: '90%', data: Number(this.route.snapshot.paramMap.get('id')) }).afterClosed().pipe(
            filter((response) => response),
            switchMap((value: Object) => {
              return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY }),
                tap((groups)=>{
                  // this.navigateToGroup([true,groups])
                })
              )
            })
          )
        })
      ),
      onUpdate.pipe(
        switchMap((group:Group) => {
          return this.dialog.open(EditGroupComponent, { disableClose: false, width: '90%', maxWidth: '90%', maxHeight: '90%', data: group }).afterClosed().pipe(
            filter((response) => response),
            switchMap((value: Object) => {
              return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY })
              )
            })
          )
        })
      ),
      onReorderGroups.pipe(
        map((groups)=>groups.map((group, index)=> { return {order:index, group_id:group.group_id}  }  )),
        switchMap((data)=>{
          return this.MapsService.reorderGroups(data).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while reording groups"); return EMPTY }),
            switchMap(()=>{
              return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY })
              ) 
            })
          )
        })
      ),
      onDelete.pipe(
        switchMap((group: Group) => {
          return  this.manageCompHelper.openConfirmationDialog([],{
            confirmationTitle: this.translate.instant('admin.detail_map.group.delete'),
            confirmationExplanation: this.translate.instant('admin.vector_provider.delete_confirmation_explanation')+ group.name +' ?',
            cancelText: this.translate.instant('cancel'),
            confirmText: this.translate.instant('delete'),
          }).pipe(
            filter(resultConfirmation => resultConfirmation),
            switchMap(()=>{
              return this.MapsService.deleteGroup(group).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while deleting groups"); return EMPTY }),
                switchMap(()=>{
                  return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
                    catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY })
                  ) 
                })
              )
            })
          )
        })

      )
    ).pipe(
      shareReplay(1),
      tap((groups)=>{
        try {
          setTimeout(() => {
            let phElement = this.placeholder.element.nativeElement;
  
            phElement.style.display = "none";
            phElement.parentNode.removeChild(phElement);
          }, 1000);
        } catch (error) {
          
        }
       
      })
    )
   }

   openGroup(group:Group){
     this.router.navigate([group.group_id],{relativeTo:this.route})
   }

  ngOnInit(): void {
  }

  /**
   * @link https://stackblitz.com/edit/angular-nhs4h4?file=src%2Fapp%2Fapp.component.html
   * @param groups 
   * @returns 
   */
  drop(groups:Group[]) {
    if (!this.target) return;

    const phElement = this.placeholder.element.nativeElement;
    const parent = phElement.parentNode;

    phElement.style.display = "none";
    parent.removeChild(phElement);
    parent.appendChild(phElement);

    parent.insertBefore(
      this.source.element.nativeElement,
      parent.children[this.sourceIndex]
    );

    // console.log(this.sourceIndex, " => ", this.phElementIndex);

    if (this.sourceIndex != this.phElementIndex) {
      moveItemInArray(groups, this.sourceIndex, this.phElementIndex);
    }

    this.target = null;
    this.source = null;
    this.phElementIndex = undefined;
    console.log(groups)
    this.onReorderGroupsInstance(groups)
  }

  enter = (drag: CdkDrag<any>, drop: CdkDropList<any>) => {
    const prevTargetIsDifferent = this.target !== drop;
    this.target = drop;

    if (drop == this.placeholder) return true;

    const phElement = this.placeholder.element.nativeElement;
    const dropElement = drop.element.nativeElement;

    const dropIndex = __indexOf(dropElement.parentNode.children, dropElement);

    if (!this.source) {
      this.source = drag.dropContainer;
      this.sourceIndex = __indexOf(
        dropElement.parentNode.children,
        drag.dropContainer.element.nativeElement
      );

      const sourceElement = this.source.element.nativeElement;

      this.fixPhElementStyling(phElement, sourceElement);

      sourceElement.parentNode.removeChild(sourceElement);
      this.source._dropListRef.start();
    }

    if (prevTargetIsDifferent) {
      const index =
        this.phElementIndex !== undefined
          ? this.phElementIndex
          : this.sourceIndex;
      this.insertAfter = index < dropIndex;
    }

    dropElement.parentNode.insertBefore(
      phElement,
      this.insertAfter ? dropElement.nextSibling : dropElement
    );
    this.phElementIndex = __indexOf(dropElement.parentNode.children, phElement);

    this.placeholder._dropListRef.enter(
      drag._dragRef,
      drag.element.nativeElement.offsetLeft,
      drag.element.nativeElement.offsetTop
    );

    return false;
  };

  private fixPhElementStyling(
    phElement: HTMLElement,
    sourceElement: HTMLElement
  ) {
    phElement.style.width = sourceElement.clientWidth + "px";
    phElement.style.height = sourceElement.clientHeight + "px";

    const size = Array.from(sourceElement.classList).find(c =>
      c.startsWith("content-item-c")
    );

    phElement.style.display = "";
    const oldSize = Array.from(phElement.classList).find(c =>
      c.startsWith("content-item-c")
    );
    if (oldSize) {
      phElement.classList.remove(oldSize);
    }
    if (size) {
      phElement.classList.add(size);
    }
  }
}

function __indexOf(collection, node) {
  return Array.prototype.indexOf.call(collection, node);
}
