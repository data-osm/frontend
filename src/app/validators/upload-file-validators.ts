import { UntypedFormControl } from '@angular/forms';

export function requiredFileType( type: string ) {
  return function ( control: UntypedFormControl ) {
    const listFile:FileList = control.value;
    if ( listFile ) {
      let response = true
      for (let index = 0; index < listFile.length; index++) {
        if (type.toLowerCase() !== listFile[index].name.split('.')[1].toLowerCase()) {
          response = false
        }
      }
      
      if ( !response) {
        return {
          requiredFileType: true
        };
      }

      return null;
    }

    return null;
  };
}
