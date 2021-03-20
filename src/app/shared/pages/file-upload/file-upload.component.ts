import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: FileUploadComponent,
      multi: true
    }
  ],
  styleUrls: ['./file-upload.component.scss']
})
/**
 * upload a file
 */
export class FileUploadComponent implements OnInit {

  /**
   * upload multiple files ?
   */
  @Input() multiple:boolean = false;
  @Input() accept:string ='*'
  onChange: Function;
  public file: FileList | null = null;

  @HostListener('change', ['$event.target.files']) emitFiles( event: FileList ) {
    let file = event && event;
    this.onChange(file);
    this.file = file;
    this.file
  }

  constructor( private host: ElementRef<HTMLInputElement> ) {
  }

  ngOnInit(){

  }

  getListFiles():File[]{
    let list = []
    try {
      for (var i = 0; i < this.file.length; i++) {
        list.push(this.file[i]);
      }
    } catch (error) {
      
    }
    return list
  }

  writeValue( value: null ) {
    // clear file input
    this.host.nativeElement.value = '';
    this.file = null;
  }

  registerOnChange( fn: Function ) {
    this.onChange = fn;
  }

  registerOnTouched( fn: Function ) {
  }

}


