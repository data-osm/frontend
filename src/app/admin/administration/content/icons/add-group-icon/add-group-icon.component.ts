import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import {IconService} from '../../../service/icon.service'
@Component({
  selector: 'app-add-group-icon',
  templateUrl: './add-group-icon.component.html',
  styleUrls: ['./add-group-icon.component.scss']
})
/**
 * add a group of icons
 */
export class AddGroupIconComponent implements OnInit {

  form: FormGroup
  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<AddGroupIconComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public IconService:IconService
  ) { 
    this.notifier = notifierService;
  }

  ngOnInit(): void {
    this.IconService.getExistsCategoryIcons().pipe().subscribe(
      (existGroups)=>{
        this.initialiseForm(existGroups)
      },
      (err)=>{
        this.notifier.notify("error", err.error);
        this.close()
      }
    )
  }

  close(): void {
    this.dialogRef.close(false);
  }


  /**
   * initalise the form
   */
  initialiseForm(existGroups: string[]) {

    this.form = this.formBuilder.group({
      'group': new FormControl('', [
        Validators.required,
        (control: AbstractControl):ValidationErrors | null=> {
          return existGroups.indexOf(control.value) == -1 ? null :{'forbiddenValue': true};;
        }
      ])

    })
  }

}
