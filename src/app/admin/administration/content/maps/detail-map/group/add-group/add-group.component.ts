import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotifierService } from 'angular-notifier';
import { EditMapComponent } from '../../../edit-map/edit-map.component';
import {MapsService} from '../../../../../service/maps.service'
import {IconService} from '../../../../../service/icon.service'
import { combineLatest, EMPTY, Observable, ReplaySubject } from 'rxjs';
import { IconsComponent } from '../../../../icons/icons.component';
import { catchError, filter, map, startWith, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { Icon } from '../../../../../../../type/type';
import { Svg, SVG } from '@svgdotjs/svg.js'
import { environment } from '../../../../../../../../environments/environment';

export interface IconWithSVGContent extends Icon{
  svgContent:string
}
@Component({
  selector: 'app-add-group',
  templateUrl: './add-group.component.html',
  styleUrls: ['./add-group.component.scss']
})
export class AddGroupComponent implements OnInit, OnDestroy {

  onAddInstance:()=>void

  public colorList = [
    { key: 'red', value: '#FF3A33' },
    { key: 'terracotta', value: '#E68673' },
    { key: 'orange', value: '#FF7733' },
    { key: 'amber', value: '#FFAA00' },
    { key: 'khaki', value: '#B3A17D' },
    { key: 'yellow', value: '#FFD11A' },
    { key: 'lime', value: '#BCD92B' },
    { key: 'grass', value: '#7ACC29' },
    { key: 'green', value: '#00CC66' },
    { key: 'moviikgreen', value: '#17E68F' },
    { key: 'jade', value: '#4D997D' },
    { key: 'teal', value: '#73DFE6' },
    { key: 'skyblue', value: '#4DC3FF' },
    { key: 'blue', value: '#0095FF' },
    { key: 'royalblue', value: '#0055FF' },
    { key: 'ultraviolet', value: '#6200EE' },
    { key: 'violet', value: '#8126FF' },
    { key: 'deeppurple', value: '#AA33FF' },
    { key: 'pink', value: '#FF99CC' },
    { key: 'strawberry', value: '#FD5B82' }
  ];
  public presetValues: string[] = [];

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  /**
   * Icon selected in data osm gallery
   */
  iconSelected:Observable<IconWithSVGContent> 
  @ViewChild(IconsComponent) iconComponent: IconsComponent;
  @ViewChild('iconOrigin') iconOrigin: ElementRef<HTMLElement>;
  @ViewChild('circleSvg') circleSvg: ElementRef<HTMLElement>;

  form: FormGroup = this.formBuilder.group({})
  private readonly notifier: NotifierService;
  
  constructor(
    public dialogRef: MatDialogRef<EditMapComponent>,
    private formBuilder: FormBuilder,
    notifierService: NotifierService,
    public MapsService:MapsService,
    public IconService:IconService,
    @Inject(MAT_DIALOG_DATA) public map_id: number,
  ) { 
    this.notifier = notifierService;
    this.presetValues = this.getColorValues();

    this.form.addControl('name',new FormControl(null, [Validators.required]))
    this.form.addControl('color',new FormControl("#02aca7", [Validators.required]))
    this.form.addControl('icon',new FormControl(null, [Validators.required]))

    this.form.addControl('type_group',new FormControl('thematiques', [Validators.required]))
    this.form.addControl('map',new FormControl(this.map_id, [Validators.required]))
  }

  ngOnInit(): void {
  }

  ngAfterViewInit() {

    this.iconSelected = this.iconComponent.onIconSelect.pipe(
      filter((icon)=> icon.path.includes('.svg')),
      switchMap((icon)=>{
        return this.IconService.loadSvgContent(icon.path).pipe(
          map((svgContent:string)=>{
            return Object.assign(icon,{svgContent:svgContent})
          }),
          catchError((err) => {this.notifier.notify("error", "An error occured while loading icons"); return EMPTY })
        )
      })
    )

    combineLatest(this.iconSelected, this.form.valueChanges.pipe(startWith(this.form.value))).pipe(
      filter( (value:[IconWithSVGContent,{color:string}]) => value[0] && value[0].svgContent != undefined),
      tap((value:[IconWithSVGContent,{color:string}])=>{
        let icon = value[0]
        let form = value[1]

        Array.from(this.iconOrigin.nativeElement.children).map(child=> this.iconOrigin.nativeElement.removeChild(child))
        Array.from(this.circleSvg.nativeElement.children).map(child=> this.circleSvg.nativeElement.removeChild(child))

        try {
          this.iconOrigin.nativeElement.appendChild(new DOMParser().parseFromString(icon.svgContent,'text/xml').firstChild )

          let circle = SVG().addTo(this.circleSvg.nativeElement).size(100, 100)
          circle.circle(100).attr({ fill: form.color})
      
          SVG(this.iconOrigin.nativeElement.firstChild).size(60, 60).each(function (i, children) {
            this.fill({ color: '#fff' })
          },true)
            .move(20, 16)
            .addTo(circle)
          
        } catch (error) {
          this.notifier.notify("error", "Sorry, can not to load this icon ! due to "+error.toString());
          Array.from(this.iconOrigin.nativeElement.children).map(child=> this.iconOrigin.nativeElement.removeChild(child))
          Array.from(this.circleSvg.nativeElement.children).map(child=> this.circleSvg.nativeElement.removeChild(child))
        }

      }),
      takeUntil(this.destroyed$)
    ).subscribe()


  }

  ngOnDestroy():void{
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  close(): void {
    this.dialogRef.close(false);
  }

  getColorValues() {
    return this.colorList.map(c => c.value);
  }

  onColorPickerSelect(color:string, field:string) {
    this.form.get(field).setValue(color);
  }

}
