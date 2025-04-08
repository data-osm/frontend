import { Component, Inject, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NotifierService } from 'angular-notifier';

@Component({
  selector: 'app-edit-layer-provider',
  templateUrl: './edit-layer-provider.component.html',
  styleUrls: ['./edit-layer-provider.component.scss']
})
export class EditLayerProviderComponent implements OnInit {

  private readonly notifier: NotifierService;

  constructor(
    public dialogRef: MatDialogRef<EditLayerProviderComponent>,
    notifierService: NotifierService,
    @Inject(MAT_DIALOG_DATA) public provider_vector_id: number,
  ) {
    this.notifier = notifierService;
  }

  close() {
    this.dialogRef.close(false)
  }

  ngOnInit(): void {
  }

}
