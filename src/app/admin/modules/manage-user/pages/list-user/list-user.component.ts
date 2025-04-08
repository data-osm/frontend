import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, merge, Observable, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { UserService } from '../../../../../data/services/user.service';
import { User } from '../../../../../type/type';
import { AddUserComponent } from '../add-user/add-user.component';

@Component({
  selector: 'app-list-user',
  templateUrl: './list-user.component.html',
  styleUrls: ['./list-user.component.scss']
})
export class ListUserComponent implements OnInit {
  onInitInstance:()=>void
  onAddInstance:()=>void

  listUsers$:Observable<User[]>
  private readonly notifier: NotifierService;

  displayedColumns: string[] = ['name'];

  constructor(
    public userService:UserService,
    public notifierService: NotifierService,
    public translate: TranslateService,
    public dialog: MatDialog
  ) {
    this.notifier = notifierService;

    const onInit:Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = ()=>{
      onInit.next()
    }

    const onAdd:Subject<void> = new ReplaySubject<void>(1)
    this.onAddInstance = ()=>{
      onAdd.next()
    }

    this.listUsers$ = merge(
      onInit.pipe(
        switchMap(()=>{
          return this.userService.getAllUsers().pipe(
            catchError((error:HttpErrorResponse) => { 
              this.notifier.notify("error", "An error occured while loading users");
              return EMPTY 
            }),
          )
        })
      ),
      onAdd.pipe(
        switchMap(()=>{
          return this.dialog.open(AddUserComponent).afterClosed().pipe(
            filter(result => result),
            switchMap(()=>{
              return this.userService.getAllUsers().pipe(
                catchError((error:HttpErrorResponse) => { 
                  this.notifier.notify("error", "An error occured while loading users");
                  return EMPTY 
                }),
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

}
