import { A11yModule } from '@angular/cdk/a11y';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkTreeModule } from '@angular/cdk/tree';
import { NgModule } from '@angular/core';
// import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar'
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner'
// import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table'
import { MatIconModule } from '@angular/material/icon'
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule, MatChipsModule as NewMatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';


import { MatDatepickerModule } from '@angular/material/datepicker';


import { MatSliderModule } from '@angular/material/slider';
import { MatSidenavModule } from '@angular/material/sidenav'
// import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip'
// import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button'
// import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card'
// import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox'
import { MatExpansionModule } from '@angular/material/expansion'
// import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input'
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar'
// import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
// import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
// import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatLegacyDialogModule } from '@angular/material/legacy-dialog';
// import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
// import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
// import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
// import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
// import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet'
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator'
// import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
@NgModule({
  exports: [
    MatIconModule,
    MatButtonToggleModule,
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
    MatIconModule,
    MatFormFieldModule,
    MatSidenavModule,
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
    MatRadioModule,
    ClipboardModule,
    MatSortModule,
    MatLegacyDialogModule,
    NewMatChipsModule,
    MatInputModule,
    MatDatepickerModule,
    MatSliderModule,
    MatNativeDateModule
  ]
})
export class ComponentMaterialModule { }
