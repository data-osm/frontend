import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { NotifierService } from 'angular-notifier';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { catchError, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { BaseMap } from '../../../../../data/models/base-maps';
import { UserService } from '../../../../../data/services/user.service';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {

  onAddInstance:()=>void

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<AddUserComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public translate: TranslateService,
    public userService:UserService
  ) { 
    this.notifier = notifierService;

    this.form.addControl('password',new FormControl(null, [Validators.required, Validators.minLength(5)]))
    this.form.addControl('email',new FormControl(null, [Validators.required, Validators.email]))

    const onAdd:Subject<void> = new Subject<void>()
    this.onAddInstance = () =>{
      onAdd.next();
    }

    onAdd.pipe(
      takeUntil(this.destroyed$),
      filter(()=>this.form.valid),
      tap(_=> this.form.disable()),
      switchMap(()=>{
        
        let parameters = {
          password:this.form.get('password').value.toString(),
          email:this.form.get('email').value.toString(),
          username:this.form.get('email').value.toString().split('@')[0].replace(/[^a-zA-Z0-9]/g,'_')
        }

        return this.userService.createUser(parameters).pipe(
          catchError( (err)=> { this.notifier.notify("error", "An error occured when adding user");this.form.enable();return EMPTY } ),
          tap(_=> this.dialogRef.close(true))
        )

      })
    ).subscribe()

  }

  ngOnInit(): void {
  }

  close(){
    this.dialogRef.close(false)
  }

}

