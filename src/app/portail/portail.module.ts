import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortailMapComponent } from './portail-map/portail-map.component';
import { PortailRoutingModule } from './portail-routing.module';

import { AddGeosignetComponent } from './pages/context-menu/add-geosignet/add-geosignet.component';
import { ContextMenuComponent } from './pages/context-menu/context-menu.component';
import { ListGeosignetComponent } from './pages/context-menu/list-geosignet/list-geosignet.component';
import { DescriptiveSheetComponent } from './pages/descriptive-sheet/descriptive-sheet.component';
import { OsmSheetComponent } from './pages/descriptive-sheet/osm-sheet/osm-sheet.component';
import { HeaderComponent } from './pages/header/header.component';
import { SearchComponent } from './pages/header/search/search.component';
import { SelectRoiComponent } from './pages/header/select-roi/select-roi.component';
import { GroupCarteComponent } from './pages/sidenav-left/sidenave-left-principal/group-carte/group-carte.component';
import { GroupThematiqueComponent } from './pages/sidenav-left/sidenave-left-principal/group-thematique/group-thematique.component';
import { SidenaveLeftPrincipalComponent } from './pages/sidenav-left/sidenave-left-principal/sidenave-left-principal.component';
import { CoucheThematiqueComponent } from './pages/sidenav-left/sidenave-left-secondaire/list-group-thematique/couche-thematique/couche-thematique.component';
import { ListGroupThematiqueComponent } from './pages/sidenav-left/sidenave-left-secondaire/list-group-thematique/list-group-thematique.component';
import { ChartOverlayComponent } from './pages/sidenav-right/download/chart-overlay/chart-overlay.component';
// import { DownloadComponent } from './pages/sidenav-right/download/download.component';
// import { ListDownloadLayersComponent } from './pages/sidenav-right/download/list-download-layers/list-download-layers.component';
import { LegendComponent } from './pages/sidenav-right/legend/legend.component';
import { AltimetryComponent } from './pages/sidenav-right/map-tools/altimetry/altimetry.component';
import { CommentComponent } from './pages/sidenav-right/map-tools/comment/comment.component';
import { DrawComponent } from './pages/sidenav-right/map-tools/draw/draw.component';
import { MapToolsComponent } from './pages/sidenav-right/map-tools/map-tools.component';
import { MeasureComponent } from './pages/sidenav-right/map-tools/measure/measure.component';
import { PrintComponent } from './pages/sidenav-right/map-tools/print/print.component';
import { RoutingComponent } from './pages/sidenav-right/routing/routing.component';
import { TableOfContentsComponent } from './pages/sidenav-right/table-of-contents/table-of-contents.component';
import { VerticalToolbarComponent } from './pages/vertical-toolbar/vertical-toolbar.component';
import { SharedModule } from '../shared/shared.module';
import { ShContextMenuModule } from 'ng2-right-click-menu';
import { ListBaseMapComponent } from './pages/sidenav-left/sidenave-left-secondaire/list-base-map/list-base-map.component';
import { PortailBaseMapComponent } from './pages/sidenav-left/sidenave-left-secondaire/list-base-map/portail-base-map/portail-base-map.component';
import { SidenavHeaderComponent } from './pages/sidenav-left/sidenave-left-secondaire/sidenav-header/sidenav-header.component';
import { ChangeProfilComponent } from './pages/change-profil/change-profil.component';
import { DownloadModule } from '../download/download.module';



@NgModule({
  declarations: [
    PortailMapComponent,
    HeaderComponent,
    VerticalToolbarComponent,
    TableOfContentsComponent,
    MapToolsComponent,
    RoutingComponent,
    LegendComponent,
    SidenaveLeftPrincipalComponent,
    DrawComponent,
    MeasureComponent,
    AltimetryComponent,
    CommentComponent,
    PrintComponent,
    GroupCarteComponent,
    GroupThematiqueComponent,
    ListGroupThematiqueComponent,
    CoucheThematiqueComponent,
    ChartOverlayComponent,
    DescriptiveSheetComponent,
    OsmSheetComponent,
    SearchComponent,
    SelectRoiComponent,
    ContextMenuComponent,
    AddGeosignetComponent,
    ListGeosignetComponent,
    ListBaseMapComponent,
    PortailBaseMapComponent,
    SidenavHeaderComponent,
    ChangeProfilComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    PortailRoutingModule,
    ShContextMenuModule,
    DownloadModule
  ],
})
export class PortailModule { }
