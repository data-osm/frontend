import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { SVG } from '@svgdotjs/svg.js';
import { NotifierService } from 'angular-notifier';
import { combineLatest, EMPTY, Observable, ReplaySubject } from 'rxjs';
import { filter, switchMap, map, catchError, startWith, tap, takeUntil } from 'rxjs/operators';
import { Icon } from '../../../../../type/type';
import { IconsComponent } from '../icons/icons.component';
import { IconWithSVGContent } from '../../../profil/pages/add-group/add-group.component';
import { IconService } from '../../../../administration/service/icon.service'
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-generate-icon',
  templateUrl: './generate-icon.component.html',
  styleUrls: ['./generate-icon.component.scss']
})
export class GenerateIconComponent implements OnInit {
  /**
   * @optional
   * use this icon to start an icon
   */
  @Input() icon: Icon
  /**
   * The icon id used to generate the icon 
   */
  @Input() icon_id?: FormControl
  /**
   * The background color of the icon
   */
  @Input() backgroundColor: FormControl = new FormControl(environment.primaryColor)
  /**
   * the circle svg icon as text
   */
  @Input() circleSvgAsText: FormControl
  /**
   * the circle svg icon as text
   */
  @Input() squareSvgAsText?: FormControl
  /**
   *  Icon selected in data from data osm gallery
   */
  iconSelected: Observable<Icon>
  /**
   * SVG Icon selected in data from data osm gallery
   */
  iconSvgSelected: Observable<IconWithSVGContent>
  /**
   * Should the icon have a background ?
   */
  @Input() background: FormControl = new FormControl(true)

  /**
   * Should the icon have a background ?
   */
  @Input() displayBackground?: boolean = true

  /**
    * The background color of the icon
    */
  @Input() iconColorForm: FormControl = new FormControl('#fff')

  @ViewChild(MatSlideToggle) matSlideToggleBackground: MatSlideToggle
  @ViewChild(IconsComponent) iconComponent: IconsComponent;
  @ViewChild('iconOrigin') iconOrigin: ElementRef<HTMLElement>;
  @ViewChild('circleSvg') circleSvg: ElementRef<HTMLElement>;
  @ViewChild('squareSvg') squareSvg: ElementRef<HTMLElement>;

  /**mode of the viewer */
  mode: 'svg' | 'raster' = 'svg'
  url_prefix = environment.backend

  private readonly notifier: NotifierService;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    notifierService: NotifierService,
    public IconService: IconService,
  ) {
    this.notifier = notifierService;
  }

  ngOnInit(): void {
  }
  ngAfterViewInit() {


    setTimeout(() => {
      if (this.icon) {
        this.iconComponent.onIconSelect.next(this.icon)
      }
    }, 500);

    this.iconSelected = this.iconComponent.onIconSelect.pipe(
      tap((icon) => {
        if (!icon.path.includes('.svg')) {
          this.mode = 'raster'
          if (this.squareSvgAsText) {
            this.squareSvgAsText.setValue(null)

          }

            this.circleSvgAsText.setValue(null)

          if (this.backgroundColor) {
            this.backgroundColor.setValue(environment.primaryColor)
          }

          this.iconColorForm.setValue('#000')
          if (this.icon_id) {
            this.icon_id.setValue(icon.icon_id)
          }
          console.log(this.circleSvgAsText.value)

        }
      })
    )

    this.iconSvgSelected = this.iconComponent.onIconSelect.pipe(
      filter((icon) => icon.path.includes('.svg')),
      switchMap((icon) => {
        this.mode = 'svg'
        return this.IconService.loadSvgContent(icon.path).pipe(
          map((svgContent: string) => {
            return Object.assign(icon, { svgContent: svgContent })
          }),
          catchError((err) => { this.notifier.notify("error", "An error occured while loading icons"); return EMPTY })
        )
      })
    )

    combineLatest(this.iconSvgSelected.pipe(startWith(this.icon)), this.backgroundColor.valueChanges.pipe(startWith(this.backgroundColor.value)), this.iconColorForm.valueChanges, this.matSlideToggleBackground.change.pipe(startWith({ checked: this.background.value }))).pipe(
      filter((value: [IconWithSVGContent, string, string, MatSlideToggleChange]) => value[0] && value[0].svgContent != undefined && this.mode=='svg'),
      tap((value: [IconWithSVGContent, string, string, MatSlideToggleChange]) => {
        let icon = value[0]
        let form = value[1]

        Array.from(this.iconOrigin.nativeElement.children).map(child => this.iconOrigin.nativeElement.removeChild(child))
        Array.from(this.circleSvg.nativeElement.children).map(child => this.circleSvg.nativeElement.removeChild(child))
        Array.from(this.squareSvg.nativeElement.children).map(child => this.squareSvg.nativeElement.removeChild(child))

        try {
          this.iconOrigin.nativeElement.appendChild(new DOMParser().parseFromString(icon.svgContent, 'text/xml').documentElement)

          let icone = SVG(this.iconOrigin.nativeElement.firstChild).size(60, 60)
          icone.each(function (i, children) {
            try {
              this.fill({ color: value[2] })
              this.node.style.fill = value[2]
            } catch (error) {
              // console.log(this, children)
            }
          }, true)
          let icone_clone = icone.clone()

          if (value[3].checked) {
            let circle = SVG().addTo(this.circleSvg.nativeElement).size(100, 100)
            circle.circle(100).attr({ fill: value[1] })
            icone
              .move(20, 16)
              .addTo(circle)

            this.circleSvgAsText.setValue(this.circleSvg.nativeElement.innerHTML)

            if (this.squareSvgAsText) {
              let square = SVG().addTo(this.squareSvg.nativeElement).size(100, 100)
              square.rect(100, 100).radius(10).attr({ fill: value[1] })
              icone_clone
                .move(20, 16)
                .addTo(square)


              this.squareSvgAsText.setValue(this.squareSvg.nativeElement.innerHTML)
            }
          } else {
            this.circleSvgAsText.setValue(this.iconOrigin.nativeElement.innerHTML)
            if (this.squareSvgAsText) {
              this.squareSvgAsText.setValue(this.iconOrigin.nativeElement.innerHTML)
            }
          }


          if (this.icon_id) {
            this.icon_id.setValue(value[0].icon_id)
          }

        } catch (error) {
          console.error(error)
          this.notifier.notify("error", "Sorry, can not to load this icon ! due to " + error.toString());
          Array.from(this.iconOrigin.nativeElement.children).map(child => this.iconOrigin.nativeElement.removeChild(child))
          Array.from(this.circleSvg.nativeElement.children).map(child => this.circleSvg.nativeElement.removeChild(child))
          Array.from(this.squareSvg.nativeElement.children).map(child => this.squareSvg.nativeElement.removeChild(child))
        }

      }),
      takeUntil(this.destroyed$)
    ).subscribe()

    this.matSlideToggleBackground.checked = this.background.value

    this.iconColorForm.setValue(this.iconColorForm.value ? this.iconColorForm.value : '#000')


    this.matSlideToggleBackground.change.pipe(
      tap((value) => {
        this.background.setValue(value.checked)
      }),
      takeUntil(this.destroyed$)
    ).subscribe()

  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}
