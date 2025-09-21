import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, FormControl, UntypedFormBuilder, FormArray, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';



@Component({
  selector: 'app-add-geosignet',
  templateUrl: './add-geosignet.component.html',
  styleUrls: ['./add-geosignet.component.scss']
})
/**
 * Modal use to add a new geosigent in the map
 */
export class AddGeosignetComponent implements OnInit {


  constructor(
    public dialogRef: MatDialogRef<AddGeosignetComponent>,
    // @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private builder: UntypedFormBuilder,
    public translate: TranslateService
  ) { }

  public signet = this.builder.group({
    nom: ["", Validators.required],
  });

  ngOnInit(): void {

  }

  valider() {
    if (this.signet.valid) {
      this.dialogRef.close(this.signet.controls['nom'].value);
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }


}
