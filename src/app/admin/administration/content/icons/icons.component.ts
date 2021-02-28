import { Component, ElementRef, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { catchError } from 'rxjs/internal/operators/catchError';
import { filter, finalize, switchMap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { manageCompHelper } from '../../../../../helper/manage-comp.helper'
import { Icon } from '../../../../type/type';
import { IconService } from '../../service/icon.service'
@Component({
  selector: 'app-icons',
  templateUrl: './icons.component.html',
  styleUrls: ['./icons.component.scss']
})
/**
 * comp icon handle
 */
export class IconsComponent implements OnInit {

  private readonly notifier: NotifierService;
  url_prefix = environment.backend
  onIconSelect:Subject<Icon> = new Subject<Icon>()
  searchResultIcon:Observable<Icon[]> 
  searchIconForm: FormGroup = this.fb.group({})

  constructor(
    public manageCompHelper: manageCompHelper,
    public IconService: IconService,
    notifierService: NotifierService,
    public fb: FormBuilder,
  ) {
    this.notifier = notifierService;
  }

  ngOnInit(): void {
    this.initilialiseSearchIcon()
  }


  /**
   * Add a group icon
   */
  addIcon() {
    this.manageCompHelper.openModalAddcon([], (response: boolean) => {

    })
  }

  initilialiseSearchIcon() {
    let searchControl = new FormControl(null, Validators.min(3))
    this.searchResultIcon = searchControl.valueChanges.pipe(
      filter((search_word) => typeof search_word === 'string' &&  search_word.length > 2),
      catchError((err) => of([]) ),
      switchMap((search_word) => {
        return this.IconService.searchIcon(search_word)
      })
    )
     
    this.searchIconForm.addControl('search_word', searchControl)

  }

  displaySelectedIcon(icon:Icon):string{
    if (icon) {
      return icon.name +', '+icon.category
    }
  }

}
