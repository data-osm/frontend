import { Directive, Input, ElementRef, SimpleChanges } from "@angular/core";
import { SVG } from "@svgdotjs/svg.js";
import { EMPTY } from "rxjs";
import { map, catchError, take } from "rxjs/operators";
import { Icon } from "../../type/type";
import { IconService } from '../../admin/administration/service/icon.service'

@Directive({ selector: 'svg-icon' })
export class SvgIconDirective {
  @Input() icon: Icon;
  @Input() color: string;
  @Input() size: number;
  constructor(public el: ElementRef<HTMLElement>, public IconService: IconService,) {

  }

  ngAfterViewInit() {
    this.updateIcon()
  }
  ngOnChanges(changes: SimpleChanges) {
    if ((changes.icon || changes.color || changes.size) && Array.from(this.el.nativeElement.children).length>0) {
      this.updateIcon()
    }
  }
  updateIcon() {
    if (this.icon) {
      let color = this.color
      Array.from(this.el.nativeElement.children).map(child => this.el.nativeElement.removeChild(child))
      if (this.icon.svgContent) {
        this.el.nativeElement.appendChild(new DOMParser().parseFromString(this.icon.svgContent, 'text/xml').firstChild)
        SVG(this.el.nativeElement.firstChild).size(this.size, this.size).each(function (i, children) {
          this.fill({ color: color })
        }, true)
      } else {
        this.IconService.loadSvgContent(this.icon.path).pipe(
          map((svgContent: string) => {
            this.icon.svgContent = svgContent
            this.el.nativeElement.appendChild(new DOMParser().parseFromString(this.icon.svgContent, 'text/xml').firstChild)
            SVG(this.el.nativeElement.firstChild).size(this.size, this.size).each(function (i, children) {
              this.fill({ color: color })
            }, true)
          }),
          catchError((err) => { return EMPTY }),
          take(1)
        ).subscribe()
      }


    }
  }
}
