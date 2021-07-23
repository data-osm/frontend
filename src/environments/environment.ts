// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  global_logo: undefined,
  primaryColor: '#023f5f',
  url_carto:'http://127.0.0.1:3000/ows/?map=',
  backend:'http://127.0.0.1:8000',
  url_frontend: "http://localhost:4200/",
  nom_instance:"Data OSM"
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *"http://adminfrance.geocameroun.xyz/",
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
