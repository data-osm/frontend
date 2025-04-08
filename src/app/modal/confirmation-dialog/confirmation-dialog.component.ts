import { Component, Inject, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

/**
 * confirmation dialog data interface
 */
export interface ConfirmationDialogData{
  confirmationTitle: string,
  confirmationExplanation: string,
  cancelText: string,
  confirmText: string,
}

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
/**
 * confirmation dialog
 */
export class ConfirmationDialogComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) { }

  ngOnInit(): void {
  }

  /**
   * close dialog
   * @param result 
   */
  closeDialog(result:boolean){
    this.dialogRef.close(result);
  }

}
