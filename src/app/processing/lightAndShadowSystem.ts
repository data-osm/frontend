import { AmbientLight, CameraHelper, Color, DirectionalLight, DirectionalLightHelper, Material, Object3D, PerspectiveCamera, ShaderChunk, Vector3 } from "three";
import { Coordinates, Instance, Map as Giro3DMap } from "../giro-3d-module";
import CSM from 'three-csm';
import { SunSystem } from "./sunSystem";
import Vec3 from "./math/vector3";
import { CartoHelper } from "../../helper/carto.helper";
import { MapControls, ShadowMapViewer } from "three/examples/jsm/Addons";
import { fromInstanceGiroEvent, fromMapGiroEvent } from "../shared/class/fromGiroEvent";
import { debounceTime, tap } from "rxjs";
import { E } from "@angular/cdk/keycodes";

const tempVec3 = new Vector3()
const temp2Vec3 = new Vector3()
export class LightAndShadowSystem {
    private readonly instance: Instance
    private readonly sunSystem: SunSystem
    private readonly map: Giro3DMap

    private sun: DirectionalLight
    private ambientLight: AmbientLight
    csm: CSM
    //@ts-expect-error
    csmHelper: CSM.Helper

    cameraHelper: CameraHelper
    sunHelper: DirectionalLightHelper

    constructor(map: Giro3DMap, instance: Instance, sunSystem: SunSystem) {
        this.map = map
        this.instance = instance
        this.sunSystem = sunSystem


        this.initializeLights()
        this.initializeCSM()
    }

    private initializeLights() {
        this.sun = new DirectionalLight('#white', LightAndShadowSystem.getSunLightIntensity(this.sunSystem.sunDirection));

        this.sun.name = "Sun light"
        this.sun.target.name = "Sun light target"
        // this.sun.castShadow = true;

        // this.sun.shadow.mapSize.width = 1024 * 1
        // this.sun.shadow.mapSize.height = 1024 * 1
        // const shadowCamera = this.sun.shadow.camera;
        // const d = 1000; // demi-largeur du volume d’ombre en unités de ta scène
        // shadowCamera.left = -d;
        // shadowCamera.right = d;
        // shadowCamera.top = d;
        // shadowCamera.bottom = -d;
        // this.sun.shadow.bias = -0.0001;
        // this.sun.shadow.normalBias = 1
        // this.sun.shadow.radius = 0
        // shadowCamera.far = 3000
        // shadowCamera.near = 1
        // shadowCamera.updateProjectionMatrix();

        // const camHelper = new CameraHelper(shadowCamera);
        // camHelper.name = "Sun light camera helper"
        // shadowCamera.far = 3000
        // shadowCamera.near = 1
        // shadowCamera.updateProjectionMatrix();
        // this.instance.add(camHelper);
        // this.cameraHelper = camHelper

        // const helper = new DirectionalLightHelper(this.sun, 5, "white");
        // helper.name = "Sun light helper"
        // this.instance.add(helper);
        // this.sunHelper = helper

        this.updateSun()

        this.sun.visible = false
        // this.instance.add(this.sun);
        // this.instance.add(this.sun.target);




        // ambient
        this.ambientLight = new AmbientLight(new Color().setRGB(1, 1, 1), LightAndShadowSystem.getAmbientLightIntensity(this.sunSystem.sunDirection));
        this.ambientLight.up.set(0, 0, 1);
        this.instance.add(this.ambientLight);
    }



    private initializeCSM() {

        const sunDir = this.sunSystem.sunDirection
        tempVec3.set(sunDir.x, sunDir.y, sunDir.z).multiplyScalar(-1)

        this.csm = new CSM({
            maxFar: 5000,
            cascades: 3,
            maxCascades: 4,
            shadowMapSize: 1024 * 2,
            lightColor: this.sunSystem.sunLightColor.clone(),
            lightDirection: tempVec3.clone(),
            camera: this.instance.view.camera,
            parent: this.instance.threeObjects,
            lightDirectionUp: new Vector3(0, 0, 1),
            lightIntensity: LightAndShadowSystem.getSunLightIntensity(this.sunSystem.sunDirection),
            mode: 'practical',
            // practicalModeLambda: 0.7,
            fade: true,
            lightMargin: 2000,
            shadowBias: -0.0003,
            shadowNormalBias: 0.9,
        });
        this.csm.update()
        this.csm.updateFrustums();


        const csmHelper = new CSM.Helper(this.csm);
        csmHelper.displayFrustum = true
        csmHelper.displayPlanes = true
        csmHelper.displayShadowBounds = true
        csmHelper.name = "CSM Helper"
        this.instance.add(csmHelper);
        csmHelper.update();
        this.csmHelper = csmHelper
        // csmHelper.visible = false

        this.updateCsmPlanes(this.instance.view.camera as PerspectiveCamera)
        // let i = 0
        // const viewers = this.csm.lights.map(l => new ShadowMapViewer(l));
        // viewers.forEach((v, i) => { v.size.set(256, 256); v.position.set(10 + i * 10, 10); v.update() });
        // console.log(viewers)
        // fromInstanceGiroEvent(this.instance, "after-render").pipe(
        //     tap((e) => {
        //         // this.csm.update()
        //         if (i > 10) {
        //             viewers.forEach(v => v.render(this.instance.renderer));
        //         }
        //         i++
        //     })
        // ).subscribe()

        // We first setup the materials of all existing tiles
        this.map.traverseMaterials((m) => {
            this.setupMaterial(m)
        })
        // We listen to new tiles to setup their materials
        fromMapGiroEvent(this.map, "object-created").pipe(
            tap((e) => {
                this.map.traverseMaterials((m) => {
                    this.setupMaterial(m)
                }, e.obj)
            })
        ).subscribe()


        fromInstanceGiroEvent(this.instance, "before-render").pipe(
            // debounceTime(500),
            // throttleTime(2000, asyncScheduler, { leading: false, trailing: true }),
            tap((e) => {
                // this.csm.update()
                this.updateCsmPlanes(this.instance.view.camera as PerspectiveCamera)

            })
        ).subscribe()

        this.sunSystem.sunDirectionChangedObservable.pipe(
            tap(() => {
                const sunDir = this.sunSystem.sunDirection
                this.csm.lightIntensity = LightAndShadowSystem.getSunLightIntensity(sunDir);
                // We set the light as the opposite of the sun direction
                // This to make sure the light is always pointing towards the sun
                tempVec3.set(sunDir.x, sunDir.y, sunDir.z).multiplyScalar(-1)
                this.csm.lightDirection.copy(tempVec3);
                this.csm.lightColor.copy(this.sunSystem.sunLightColor)
                this.csm.update()
            })
        ).subscribe()

    }

    update() {
        // Update SUN/direction light
        // this.updateSun()
        // Update ambient light
        this.ambientLight.intensity = LightAndShadowSystem.getAmbientLightIntensity(this.sunSystem.sunDirection)

        // Update CSM
        this.updateCsmPlanes(this.instance.view.camera as PerspectiveCamera)
    }

    private updateSun() {
        const sunDir = this.sunSystem.sunDirection
        this.sun.intensity = LightAndShadowSystem.getSunLightIntensity(sunDir);

        tempVec3.copy((this.instance.view.controls as MapControls).target)
        tempVec3.z = 0
        const sunPosition = tempVec3.clone().addScaledVector(new Vector3(sunDir.x, sunDir.y, sunDir.z), 1000)
        this.sun.position.copy(sunPosition)
        this.sun.target.position.copy(tempVec3).setZ(0);
        this.sun.updateMatrixWorld(true);
        this.sun.updateMatrix()
        this.sun.target.updateMatrix()
        this.sun.target.updateMatrixWorld(true)

    }

    setupMaterial(material: Material) {

        const fn = (shader) => {

            // @ts-expect-error
            const breaksVec2 = this.csm.getExtendedBreaks();

            const far = Math.min(this.csm.camera.far, this.csm.maxFar);

            shader.uniforms.CSM_cascades = { value: breaksVec2 };
            shader.uniforms.cameraNear = { value: Math.min(this.csm.maxFar, this.csm.camera.near) };
            shader.uniforms.shadowFar = { value: far };

            material.defines = material.defines || {};
            material.defines.USE_CSM = 1;
            material.defines.CSM_CASCADES = this.csm.cascades;
            material.defines.CSM_FADE = this.csm.fade ? '' : undefined;

            material.needsUpdate = true;
            // @ts-expect-error
            this.csm.shaders.set(material, shader);

            material.addEventListener('dispose', () => {
                // @ts-expect-error
                this.csm.shaders.delete(material);

            });

        };

        if (!material.onBeforeCompile) {

            material.onBeforeCompile = fn;

        } else {

            const previousFn = material.onBeforeCompile.bind(material);

            material.onBeforeCompile = (...args) => {

                previousFn(...args);
                fn(args[0]);

            };

        }

    }

    updateCsmPlanes(camera: PerspectiveCamera) {


        let mapPosition: Coordinates
        let cameraPosition: Vector3

        try {
            const mapBoundingBox = CartoHelper.getVisibleTileBoundingBox(this.map)

            if (mapBoundingBox.isEmpty()) {
                throw new Error("Map bounding box is undefined when updating csm")
            }

            mapBoundingBox.getCenter(tempVec3)
            mapBoundingBox.getSize(temp2Vec3)

            const mapCenter = new Coordinates("EPSG:3857", tempVec3.x, tempVec3.y);
            mapPosition = mapCenter.clone().as("EPSG:4326");

            cameraPosition = new Vector3(tempVec3.x, tempVec3.y, camera.position.z)
            const extentDimensions = temp2Vec3.clone()


            const newMaxFar = Math.min(extentDimensions.x, extentDimensions.y)
            // if (Math.abs(newMaxFar - this.csm.maxFar) > 200) {
            //     this.csm.maxFar = Math.min(newMaxFar, 7000)
            //     this.csm.updateFrustums();
            //     // console.log("new max far", this.csm.maxFar)
            // }

            // console.log("ok")
        } catch (error) {
            // cameraPosition = camera.position
            // mapPosition = new Coordinates("EPSG:3857", cameraPosition.x, cameraPosition.y).as("EPSG:4326");
            console.error(error)
        }

        this.csm.update();
        this.csm.updateFrustums();


        this.csm.frustums.forEach((_, index) => {
            const light = this.csm.lights[index];

            light.shadow.camera.updateMatrixWorld(true);
            light.updateMatrixWorld(true)
            light.target.updateMatrixWorld(true)
        })


    }

    static getSunLightIntensity(sunDirection: Vec3) {
        return sunDirection.z < 0 ? 0.0 : 10.0
    }
    static getAmbientLightIntensity(sunDirection: Vec3) {
        return sunDirection.z < 0 ? 0.1 : 0.2
    }
}