import { ElementRef, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { Component, OnInit, Directive, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { SVG } from '@svgdotjs/svg.js';
import { NotifierService } from 'angular-notifier';
import { combineLatest, EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, map, switchMap, take, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Group, Icon } from '../../../../../type/type';
import { IconService } from '../../../service/icon.service';
import { MapsService } from '../../../service/maps.service'
import { AddGroupComponent } from './group/add-group/add-group.component';
import {manageCompHelper} from '../../../../../../helper/manage-comp.helper'
import { TranslateService } from '@ngx-translate/core';
import { EditMapComponent } from '../edit-map/edit-map.component';
import { EditGroupComponent } from './group/edit-group/edit-group.component';

@Directive({ selector: 'svg-icon' })
export class SvgIcon {
  @Input() icon: Icon;
  @Input() color: string;
  @Input() size: number;
  constructor(public el: ElementRef<HTMLElement>, public IconService: IconService,) {

  }

  ngAfterViewInit() {
    this.updateIcon()
  }
  ngOnChanges(changes: SimpleChanges) {
    if ((changes.icon || changes.color || changes.size) && Array.from(this.el.nativeElement.children).length>0) {
      this.updateIcon()
    }
  }
  updateIcon() {
    if (this.icon) {
      let color = this.color
      Array.from(this.el.nativeElement.children).map(child => this.el.nativeElement.removeChild(child))
      if (this.icon.svgContent) {
        this.el.nativeElement.appendChild(new DOMParser().parseFromString(this.icon.svgContent, 'text/xml').firstChild)
        SVG(this.el.nativeElement.firstChild).size(this.size, this.size).each(function (i, children) {
          this.fill({ color: color })
        }, true)
      } else {
        this.IconService.loadSvgContent(this.icon.path).pipe(
          map((svgContent: string) => {
            this.icon.svgContent = svgContent
            this.el.nativeElement.appendChild(new DOMParser().parseFromString(this.icon.svgContent, 'text/xml').firstChild)
            SVG(this.el.nativeElement.firstChild).size(this.size, this.size).each(function (i, children) {
              this.fill({ color: color })
            }, true)
          }),
          catchError((err) => { return EMPTY }),
          take(1)
        ).subscribe()
      }


    }
  }
}

@Component({
  selector: 'app-detail-map',
  templateUrl: './detail-map.component.html',
  styleUrls: ['./detail-map.component.scss']
})
export class DetailMapComponent implements OnInit {

  onAddInstance: () => void
  onUpdateInstance: (group: Group) => void
  onDeleteInstance: (group: Group) => void
  environment = environment
  onGroupSelect: Subject<Group> = new Subject<Group>()

  private readonly notifier: NotifierService;

  /**
   * group list of a map
   */
  groups: Observable<Group[]>

  @ViewChildren(SvgIcon) svgIcons: QueryList<SvgIcon>

  constructor(
    public MapsService: MapsService,
    public IconService: IconService,
    public route: ActivatedRoute,
    notifierService: NotifierService,
    public dialog: MatDialog,
    public manageCompHelper:manageCompHelper,
    public translate: TranslateService,
  ) {

    this.notifier = notifierService;

    const onAdd: Subject<void> = new Subject<void>()
    this.onAddInstance = () => {
      onAdd.next();
    }

    const onUpdate: Subject<Group> = new Subject<Group>()
    this.onUpdateInstance = (group: Group) => {
      onUpdate.next(group);
    }

    const onDelete: Subject<Group> = new Subject<Group>()
    this.onDeleteInstance = (group: Group) => {
      onDelete.next(group);
    }

    this.groups = merge(
      this.route.params.pipe(
        filter(() => this.route.snapshot.paramMap.get('id') != undefined),
        switchMap((value: Object) => {
          return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
            catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY })
          )
        })
      ),
      onAdd.pipe(
        filter(() => this.route.snapshot.paramMap.get('id') != undefined),
        switchMap(() => {
          return this.dialog.open(AddGroupComponent, { disableClose: false, width: '90%', maxWidth: '90%', maxHeight: '90%', data: Number(this.route.snapshot.paramMap.get('id')) }).afterClosed().pipe(
            filter((response) => response),
            switchMap((value: Object) => {
              return this.MapsService.getAllGroupOfMap(Number(this.route.snapshot.paramMap.get('id'))).pipe(
                catchError(() => { this.notifier.notify("error", "An error occured while loading groups"); return EMPTY })
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
    )

  }

  ngOnInit(): void {

  }

}