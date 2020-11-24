import { A11yModule } from '@angular/cdk/a11y';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkTreeModule } from '@angular/cdk/tree';
import { NgModule } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import {MatProgressBarModule} from '@angular/material/progress-bar'
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner'
import {MatTableModule} from '@angular/material/table'

// import {
//   MatAutocompleteModule,
//   MatBadgeModule,
//   MatBottomSheetModule,
//   MatButtonModule,
//   MatButtonToggleModule,
//   ,
//   MatCheckboxModule,
//   MatChipsModule,
//   MatDatepickerModule,
//   MatDialogModule,
//   MatDividerModule,
//   MatExpansionModule,
//   MatGridListModule,
//   MatIconModule,
//   ,
//   MatListModule,
//   // MatMenuModule,
//   MatNativeDateModule,
//   MatPaginatorModule,
//   MatProgressBarModule,
//   MatProgressSpinnerModule,
//   MatRadioModule,
//   MatRippleModule,
//   MatSelectModule,
//   MatSidenavModule,
//   MatSliderModule,
//   MatSlideToggleModule,
//   MatSnackBarModule,
//   MatSortModule,
//   MatStepperModule,
//   MatTableModule,
//   MatTabsModule,
//   MatToolbarModule,
//   MatTooltipModule,
//   MatTreeModule,
// } from '@angular/material';

import { MatSidenavModule } from '@angular/material/sidenav'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import {MatCheckboxModule} from '@angular/material/checkbox'
import {MatExpansionModule} from '@angular/material/expansion'
import {MatInputModule} from '@angular/material/input'
import {MatSnackBarModule} from '@angular/material/snack-bar'
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSliderModule} from '@angular/material/slider';
import {MatChipsModule} from '@angular/material/chips';
import {MatBadgeModule} from '@angular/material/badge';
import {MatDialogModule} from '@angular/material/dialog';
import {MatTabsModule} from '@angular/material/tabs';
import {MatListModule} from '@angular/material/list';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatSelectModule} from '@angular/material/select';
import {MatBottomSheetModule} from '@angular/material/bottom-sheet'
import {MatPaginatorModule} from '@angular/material/paginator'
import {MatRadioModule} from '@angular/material/radio';
@NgModule({
  exports: [
    A11yModule,
    CdkStepperModule,
    CdkTableModule,
    CdkTreeModule,
    DragDropModule,
    MatSnackBarModule,
    MatMenuModule,
    MatCardModule,
    MatSidenavModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTooltipModule,
    PortalModule,
    ScrollingModule,
    MatExpansionModule,
    MatInputModule,
    MatFormFieldModule,
    MatSliderModule,
    MatChipsModule,
    MatBadgeModule,
    MatDialogModule,
    MatTabsModule,
    MatListModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatBottomSheetModule,
    MatPaginatorModule,
    MatTableModule,
    MatRadioModule
  ]
})
export class ComponentMaterialModule { }
