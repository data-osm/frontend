import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { Coordinates, COPCSource, Map, OrbitControls, PickObjectsAtOptions, PointCloud, PointCloudAttribute, PointCloudMetadata } from "../../../../giro-3d-module"
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators, AbstractControl } from '@angular/forms';
import { delay, EMPTY, filter, forkJoin, from, fromEvent, iif, interval, map, merge, of, ReplaySubject, retryWhen, startWith, Subject, switchMap, takeUntil, takeWhile, tap } from 'rxjs';
import * as OBC from "@thatopen/components";
import { CartoHelper } from '../../../../../helper/carto.helper';
import { Box3, EventDispatcher, Group, Matrix4, MeshBasicMaterial, Vector3 } from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { FeaturesStoreService } from '../../../../data/store/features.store.service';
import * as FRAGS from "@thatopen/fragments";



import { makeColorRamp } from '../../../../processing/pointClound/colormap';

import ImportIfc from '../../../../processing/ifc/importIfc';
import ImportPointCloud from '../../../../processing/pointClound/importPointCloud';

import { MatSelectionListChange } from '@angular/material/list';
import { HttpClient } from '@angular/common/http';
import { MatomoTracker } from 'ngx-matomo-client';

const EXAMPLE_LIDAR_FILE_URL = "https://demo.openstreetmap.fr/icons/example-files/LHD_FXX_0913_6459_PTS_O_3857.copc.laz"
const EXAMPLE_LIDAR_FILE_NAME = "LHD_FXX_0913_6459_PTS"

const tempBox = new Box3();
const tempVec3 = new Vector3();

const importIfc = new ImportIfc()
const importPointCloud = new ImportPointCloud()

interface PointCloudInstance {
  pointCloud: PointCloud,
  metadata: PointCloudMetadata
  selectedAttribute: PointCloudAttribute
  index: number
}
@Component({
  selector: 'app-import-data',
  templateUrl: './import-data.component.html',
  styleUrls: ['./import-data.component.scss']
})
export class ImportDataComponent implements OnInit {

  @Input() map: Map

  readonly importIFCForm: UntypedFormGroup
  readonly importPointCloudForm: UntypedFormGroup

  ifcList: FRAGS.FragmentsGroup[] = []
  pointCloudList: PointCloudInstance[] = []
  transformControls: TransformControls

  ifcLoading = false
  pointCloudLoading = false

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  public onUploadIFCInstance: () => void
  public onUploadPointCloudInstance: () => void
  public onUseExamplePointCloudInstance: () => void

  public onInitInstance: () => void;

  constructor(
    private formBuilder: UntypedFormBuilder,
    public featuresStoreService: FeaturesStoreService,
    private http: HttpClient,
    private readonly tracker: MatomoTracker
  ) {



    const onInit: Subject<void> = new ReplaySubject<void>(1)
    this.onInitInstance = () => {
      onInit.next()
    }

    const onImportIFC: Subject<void> = new Subject<void>()
    this.onUploadIFCInstance = () => {
      onImportIFC.next()
    }

    const onImportPointCloud: Subject<void> = new Subject<void>()
    this.onUploadPointCloudInstance = () => {
      this.tracker.trackEvent("Click", "Import data", "Use his point cloud")
      onImportPointCloud.next()
    }

    const onUseExamplePointCloud: Subject<void> = new Subject<void>()
    this.onUseExamplePointCloudInstance = () => {
      this.tracker.trackEvent("Click", "Import data", "Use example point cloud")
      onUseExamplePointCloud.next()
    }

    this.importIFCForm = this.formBuilder.group({
      ifcFile: new UntypedFormControl(null, [Validators.required]),
    })
    this.importPointCloudForm = this.formBuilder.group({
      pointCloudFile: new UntypedFormControl(null, [Validators.required]),
    })


    onInit.pipe(
      switchMap(() => {
        this.transformControls = new TransformControls(this.map.instance.view.camera, this.map.instance.renderer.domElement);
        window.addEventListener('keydown', (event) => {
          switch (event.key) {
            case 't': this.transformControls.setMode('translate'); break;
            case 'r': this.transformControls.setMode('rotate'); break;
            case 's': this.transformControls.setMode('scale'); break;
          }
        });

        this.importIFCForm.disable();

        return forkJoin([
          from(importIfc.initialize()).pipe(
            tap(() => {

              this.importIFCForm.enable();
            }),
            switchMap(() => {
              return onImportIFC.pipe(
                filter(() => this.importIFCForm.valid),
                tap(() => this.importIFCForm.disable()),
                switchMap(() => {

                  const extension = (this.importIFCForm.get('ifcFile').value[0]).name.split('.').pop().toLowerCase();

                  return iif(() => extension === 'rvt',
                    importIfc.convertRvtToIFC(
                      toFormData({
                        "file": (this.importIFCForm.get('ifcFile').value[0])
                      })
                    ).pipe(
                      tap(() => {
                        this.ifcLoading = true
                      }),
                      switchMap((ifc) => {
                        return importIfc.getConversionRvtToIfcStatus(ifc.id).pipe(
                          map((rvtToIfcStatus) => {
                            if (rvtToIfcStatus.status === 'pending') {
                              throw "The conversion is pending"
                            }
                            return rvtToIfcStatus
                          }),
                          retryWhen((errors) => {
                            return errors.pipe(
                              tap(val => console.warn(val)),
                              delay(30000),
                            )
                          }),
                        )
                      }),
                      switchMap((rvtToIfcStatus) => {
                        if (rvtToIfcStatus.status === 'failed') {
                          console.error(rvtToIfcStatus)
                          alert("The conversion is failed")
                          return EMPTY
                        } else {
                          return importIfc.downloadFile(rvtToIfcStatus.download_url).pipe(
                            switchMap((blob) => {
                              return blob.arrayBuffer()
                            }),
                            map((buffer) => {
                              return new Uint8Array(buffer)
                            })
                          )
                        }
                      }),
                      tap(() => {
                        this.ifcLoading = false
                      }),
                    ),
                    of((this.importIFCForm.get('ifcFile').value[0]).bytes()).pipe(
                      switchMap((bytes) => {
                        return bytes
                      })
                    )
                  )

                })
              )
            }),
            switchMap((ifcBuffer: Uint8Array) => {
              return importIfc.load(ifcBuffer);
            }),
            tap((ifc) => {
              this.afterIFCLoaded(ifc, (this.importIFCForm.get('ifcFile').value[0]).name)
              this.importIFCForm.get('ifcFile').reset()
            }),
            tap(() => {
              this.importIFCForm.enable();
            }),
          ),
          merge(
            onUseExamplePointCloud.pipe(
              switchMap(() => {
                this.pointCloudLoading = true
                return this.http.get(EXAMPLE_LIDAR_FILE_URL, { responseType: 'blob' }).pipe(
                  switchMap((blob) => {
                    return forkJoin([importPointCloud.load(blob), of(EXAMPLE_LIDAR_FILE_NAME)])
                  })
                )
              })
            ),
            onImportPointCloud.pipe(
              filter(() => this.importPointCloudForm.valid),
              switchMap(() => {
                this.pointCloudLoading = true
                return forkJoin([importPointCloud.load(this.importPointCloudForm.get('pointCloudFile').value[0]), of(this.importPointCloudForm.get('pointCloudFile').value[0].name as string)])
              }),
            )
          ).pipe(
            switchMap(([pointCloudSource, name]: [COPCSource, string]) => {
              const entity = new PointCloud({ source: pointCloudSource });
              return forkJoin([from(this.map.instance.add(entity)), from(pointCloudSource.getMetadata()), of(name)])
            }),
            tap(([entity, metadata, name]: [PointCloud, PointCloudMetadata, string]) => {
              this.afterPointCloudLoaded(entity, metadata, name)
              this.importPointCloudForm.get('pointCloudFile').reset()
              this.pointCloudLoading = false
            })
          ),

        ])
      }),

    ).subscribe()


  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.map) {
      setTimeout(() => {
        this.initialiseClickEventOnIFC()
        this.onInitInstance()
        // this.loadLaz()
      }, 1000)

    }
  }

  zoomToIfc(ifc: FRAGS.FragmentsGroup) {
    new CartoHelper(this.map).panTo(ifc.position)
  }
  zoomToPointCloud(pointCloud: PointCloud) {
    const box = pointCloud.getBoundingBox()
    box.getCenter(tempVec3)
    new CartoHelper(this.map).zoomOnTomBox(box)
  }

  changePointCloudSelectedAttribute(event: MatSelectionListChange, pointCloudInstance: PointCloudInstance) {
    const selectedAttribute = event.options.find(option => option.selected).value;
    if (selectedAttribute) {
      importPointCloud.activeAttribute(pointCloudInstance.pointCloud, selectedAttribute);
      pointCloudInstance.selectedAttribute = selectedAttribute
    }
  }

  getElevation(x, y) {
    const result = this.map.getElevation({ coordinates: new Coordinates(this.map.extent.crs, x, y) })
    if (result.samples.length > 0) {
      // Let's sort the samples to get the highest resolution sample first
      result.samples.sort((a, b) => a.resolution - b.resolution);

      const elevation = result.samples[0].elevation;
      return elevation
    }
    return 0
  }

  afterIFCLoaded(ifc: FRAGS.FragmentsGroup, name: string) {
    const mapCenter = CartoHelper.getMapExtent(this.map).center()
    tempBox.setFromObject(ifc);
    tempBox.getSize(tempVec3);
    tempVec3.set(mapCenter.x, mapCenter.y, tempVec3.y)
    ifc.rotation.x = -Math.PI / 2;
    tempVec3.z = + this.getElevation(mapCenter.x, mapCenter.y)

    // const elevation = this.map.getElevation({ coordinates: new Coordinates(this.map.extent.crs, ifc.position.x, ifc.position.y) })
    ifc.position.copy(tempVec3);
    ifc.updateMatrixWorld();



    this.map.instance.add(ifc)
    this.zoomToIfc(ifc)
    const i = this.ifcList.push(ifc)
    ifc.userData.index = i
    ifc.userData.name = name
    ifc.userData.minZ = tempVec3.y
    this.attachTransFormControlsToIfc(ifc)

  }

  afterPointCloudLoaded(pointCloud: PointCloud, metadata: PointCloudMetadata, name: string) {
    const instance = this.map.instance

    pointCloud.userData.name = name

    const attribute = metadata.attributes.find(attribute => attribute.name === 'Classification') ?? metadata.attributes[0];
    importPointCloud.activeAttribute(pointCloud, attribute)
    this.zoomToPointCloud(pointCloud)
    instance.notifyChange();


    this.pointCloudList.push({
      pointCloud: pointCloud,
      metadata: metadata,
      selectedAttribute: attribute,
      index: this.pointCloudList.length
    })
  }

  initialiseClickEventOnIFC() {
    const mousedown$ = fromEvent<MouseEvent>(this.map.instance.domElement, 'mousedown');
    const mousemove$ = fromEvent<MouseEvent>(document, 'mousemove');
    const mouseup$ = fromEvent<MouseEvent>(document, 'mouseup');
    const clickWithoutDrag$ = mousedown$
      .pipe(
        switchMap((startEvent) => {
          const startX = startEvent.clientX;
          const startY = startEvent.clientY;
          return mouseup$.pipe(
            takeUntil(mousemove$),
            map((endEvent) => {
              const dx = Math.abs(endEvent.clientX - startX);
              const dy = Math.abs(endEvent.clientY - startY);
              return { dx, dy };
            }),
            filter(({ dx, dy }) => dx < 5 || dy < 5), // seuil de tolérance
            map(() => startEvent)
          );
        })
      )

    clickWithoutDrag$.pipe(
      takeUntil(this.destroyed$),
      filter(() => this.ifcList.length > 0),
      tap((evt) => {
        const pickOptions: PickObjectsAtOptions = {
          limit: Infinity,
          radius: 0,
          sortByDistance: true,
          gpuPicking: false,
          where: this.ifcList
        };
        const map_pick_result = this.map.instance.pickObjectsAt(evt, pickOptions)


        const clickIfcIndex = map_pick_result
          .filter((res) => res.object.parent.userData.index)
          .filter((res) => this.ifcList.map((ifc) => ifc.userData.index).includes(res.object.parent.userData.index))
          .map((res) => res.object.parent.userData.index)

        this.detachTransFormControlsToIfc()
        if (clickIfcIndex.length > 0) {
          const clickedIfc = this.ifcList.find((ifc) => ifc.userData.index == clickIfcIndex[0])
          this.attachTransFormControlsToIfc(clickedIfc)
        }

      })
    ).subscribe()

  }

  detachTransFormControlsToIfc() {
    function _removeAllEventListeners(object: EventDispatcher) {
      if ((object as any)._listeners) {
        delete (object as any)._listeners;
      }
    }
    this.transformControls.detach()
    _removeAllEventListeners(this.transformControls)
    const transformControlsHelper = this.transformControls.getHelper()
    try {
      this.map.instance.remove(transformControlsHelper)
    } catch (error) {
      console.log(error)
    }
  }

  attachTransFormControlsToIfc(ifc: FRAGS.FragmentsGroup) {
    this.transformControls.attach(ifc);
    tempBox.setFromObject(ifc);
    const ifcHeight = tempBox.getSize(tempVec3).y;

    const transformControlsHelper = this.transformControls.getHelper()
    transformControlsHelper.updateMatrix();
    transformControlsHelper.updateMatrixWorld();


    this.map.instance.add(transformControlsHelper);
    this.transformControls.addEventListener('change', () => {
      const elevation = this.getElevation(ifc.position.x, ifc.position.y)
      if (ifc.position.z < elevation) {
        ifc.position.z = elevation
      }
      transformControlsHelper.updateMatrixWorld();
      this.map.instance.notifyChange([this.map.instance.scene, ifc, transformControlsHelper], {
        immediate: true,
        needsRedraw: true
      })
    });
    this.transformControls.addEventListener('dragging-changed', (event) => {
      (this.map.instance.view.controls as OrbitControls).enabled = !event.value;
    });

  }

  public pointCloudTrackBy(index: number, item: PointCloudInstance) {
    return item.index;
  }

  public removePointCloud(item: PointCloudInstance) {
    this.map.instance.remove(item.pointCloud)
    this.pointCloudList = this.pointCloudList.filter((pointCloud) => pointCloud.index != item.index)

  }

}

export function toFormData<T>(formValue: T) {
  const formData = new FormData();

  for (const key of Object.keys(formValue)) {
    const value = formValue[key];
    formData.append(key, value);
  }

  return formData;
}