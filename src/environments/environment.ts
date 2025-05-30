// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  global_logo: undefined,
  primaryColor: '#023f5f',
  // backend: 'https://ws.dataosm.info',
  // url_carto: 'https://tiles.dataosm.info/ows/?map=',
  backend: 'http://localhost:8000',
  url_carto: 'http://localhost:3000/ows/?map=',
  url_frontend: 'http://localhost:4200',
  nom_instance: "OSMdata",
  matomoUrl: 'https://piwik.dataosm.info/',
  matomoSiteId: 4,
  building_tile: "https://buildings.dataosm.info/data/data/{z}/{x}/{y}.pbf"
  // building_tile: "http://localhost:8081/data/data/{z}/{x}/{y}.pbf"
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
