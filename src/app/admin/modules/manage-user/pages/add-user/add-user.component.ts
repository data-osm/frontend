import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
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

  form: UntypedFormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<AddUserComponent>,
    private formBuilder: UntypedFormBuilder,
    notifierService: NotifierService,
    public translate: TranslateService,
    public userService:UserService
  ) { 
    this.notifier = notifierService;

    this.form.addControl('password',new UntypedFormControl(null, [Validators.required, Validators.minLength(5)]))
    this.form.addControl('password_2',new UntypedFormControl(null, [Validators.required, Validators.minLength(5)]))
    this.form.addControl('first_name',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('last_name',new UntypedFormControl(null, [Validators.required]))
    this.form.addControl('email',new UntypedFormControl(null, [Validators.required, Validators.email]))

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
          password_2:this.form.get('password_2').value.toString(),
          last_name:this.form.get('last_name').value.toString(),
          first_name:this.form.get('first_name').value.toString(),
          email:this.form.get('email').value.toString(),
          username:this.form.get('email').value.toString().split('@')[0].replace(/[^a-zA-Z0-9]/g,'_'),
          is_superuser:true
        }

        return this.userService.createUser(parameters).pipe(
          catchError( (err)=> { 
            this.form.enable();
            if (err.error.status_code == 400){
              for (const key in err.error) {
                const element = err.error[key];
                if (Object.keys(this.form.controls).indexOf(key)>-1){
                    this.form.get(key).setErrors({"invalid":element.join(" ")}, {emitEvent:true})
                  }
              }
            }else{
              this.notifier.notify("error", "An error occurred when adding user");
            }

            return EMPTY
           } ),
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

