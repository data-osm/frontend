import Vec2 from "./math/vector2";
import SunCalc from 'suncalc';
import Vec3 from "./math/vector3";
import { AmbientLight, Color, DirectionalLight, MathUtils, Mesh, MeshStandardMaterial, NoToneMapping, PerspectiveCamera, PMREMGenerator, Scene, SphereGeometry, SRGBColorSpace, Texture, Vector3, WebGLRenderer, WebGLRenderTarget } from "three";
import { Instance } from "../giro-3d-module";
import { Sky } from "three/examples/jsm/objects/Sky";
import { BehaviorSubject, Subject } from "rxjs";
import { ParametersService } from "../data/services/parameters.service";
const FRANCE_COORD = [48.866667, 2.333333]




export class SunSystem {
    sunDirection: Vec3
    sunLightColor: Color = new Color(1, 1, 1)

    private parameterService: ParametersService
    private updatableObjects: Vector3[] = []
    private skyScene: Scene
    private pmrem: PMREMGenerator
    private sky: Sky
    private instance: Instance
    private pmremRendertarget: WebGLRenderTarget<Texture>
    private currentDate: number
    private currentPosition: Vec2
    private sunDirectionChanged$ = new Subject<void>()
    private skyChanged$ = new Subject<void>()
    private datetimeChanged$ = new Subject<void>()

    get sunDirectionChangedObservable() {
        return this.sunDirectionChanged$.asObservable()
    }

    get skyChangedObservable() {
        return this.skyChanged$.asObservable()
    }

    get datetimeChangedObservable() {
        return this.datetimeChanged$.asObservable()
    }

    get currentDateTime() {
        return new Date(this.currentDate)
    }

    get currentPos() {
        return this.currentPosition
    }
    constructor(
        instance: Instance,
        initialPosition: Vec2,
        parameterService: ParametersService
    ) {
        this.parameterService = parameterService
        this.skyScene = new Scene();
        this.pmrem = new PMREMGenerator(instance.renderer);
        this.pmrem.compileCubemapShader();

        this.instance = instance
        this.currentPosition = initialPosition
    }

    setSky(sky: Sky) {

        this.sky = sky

    }

    private polarToCartesian(azimuth: number, altitude: number): Vec3 {
        const az = -azimuth - Math.PI / 2;
        const cosA = Math.cos(altitude);
        const x = cosA * Math.cos(az); // Est
        const y = cosA * Math.sin(az); // Nord
        const z = Math.sin(altitude);       // Haut

        return new Vec3(
            x, y, z
        )
    }

    private getSunDirection(position: Vec2, date: Date | number) {

        // console.log(position)
        // const sunPosition = SunCalc.getPosition(date, FRANCE_COORD[0], FRANCE_COORD[1]);
        const sunPosition = SunCalc.getPosition(date, position.x, position.y);

        this.sunLightColor.copy(new Color(1, 1, 1))
        // this.sunLightColor.copy(kelvinToRGB(sunKelvinFromAltitude(sunPosition.altitude)))
        return this.polarToCartesian(sunPosition.azimuth + Math.PI, sunPosition.altitude)
    }
    /**
     * 
     * @param position Vec2(lat, lon)
     * @param date 
     */
    update(position: Vec2, date?: Date | number) {
        let dateChanged = true
        if (!date) {
            dateChanged = false
            date = Date.now();
        }
        if (date && (Boolean(this.parameterService.dateTimesInterval.start) || Boolean(this.parameterService.dateTimesInterval.end))) {
            if (Boolean(this.parameterService.dateTimesInterval.start)) {

                if (this.parameterService.dateTimesInterval.start > date.valueOf() || this.parameterService.dateTimesInterval.end < date.valueOf()) {
                    date = this.parameterService.dateTimesInterval.start
                }
            } else if (Boolean(this.parameterService.dateTimesInterval.end)) {
                if (this.parameterService.dateTimesInterval.end < date.valueOf()) {
                    date = this.parameterService.dateTimesInterval.end
                }
            }
        }
        this.sunDirection = this.getSunDirection(position, date)
        // this.sunDirectionChanged$.next(this.sunDirection)
        for (const obj of this.updatableObjects) {
            obj.fromArray(Vec3.toArray(this.sunDirection))
        }
        // if date have changed, we need to update the sky texture
        if (date && typeof date === 'number' ? date : date.valueOf() !== this.currentDate) {
            this.generateSkyTexture()
            this.skyChanged$.next()
            this.sunDirectionChanged$.next()
        }

        // if position have changed, we need to notice that we need to update the sun direction
        if (this.currentPosition && distanceInMeters(this.currentPosition.y, this.currentPosition.x, position.y, position.x) > 1000) {
            this.currentPosition = position
            this.sunDirectionChanged$.next()
        }
        this.currentDate = typeof date === 'number' ? date : date.valueOf()
        if (dateChanged) {
            this.datetimeChanged$.next()
        }

    }

    registerUpdatableObject(obj: Vector3) {
        this.updatableObjects.push(obj)
    }

    private generateSkyTexture() {
        const t0 = performance.now();
        const skyForIBL = this.sky.clone();
        skyForIBL.scale.copy(this.sky.scale);
        // Sky position is on the camera to make the sky always face the camera
        // But for the environment map, we need the sky to be at center
        skyForIBL.position.set(0, 0, 0);
        this.skyScene.clear();
        this.skyScene.add(skyForIBL);

        this.pmremRendertarget = this.pmrem.fromScene(this.skyScene, 0, this.instance.view.near, this.instance.view.far);
        // console.log( `Temps écoulé  getSkyTexture: ${(performance.now() - t0).toFixed(2)} ms`);

    }

    getSkyTexture() {
        if (!this.pmremRendertarget) {
            this.generateSkyTexture()
        }
        return {
            "CUBEUV_TEXEL_WIDTH": (1 / this.pmremRendertarget.width),
            "CUBEUV_TEXEL_HEIGHT": (1 / this.pmremRendertarget.height),
            //@ts-expect-error 
            "CUBEUV_MAX_MIP": this.pmrem._lodMax,
            texture: this.pmremRendertarget.texture
        }
    }


}



function kelvinToRGB(K) {
    let t = K / 100, r, g, b;
    if (t <= 66) { r = 255; g = 99.4708 * Math.log(t) - 161.1196; b = t <= 19 ? 0 : 138.5177 * Math.log(t - 10) - 305.0448; }
    else { r = 329.6987 * Math.pow(t - 60, -0.1332048); g = 288.1222 * Math.pow(t - 60, -0.07551485); b = 255; }
    return new Color(
        MathUtils.clamp(r, 0, 255) / 255,
        MathUtils.clamp(g, 0, 255) / 255,
        MathUtils.clamp(b, 0, 255) / 255
    );
}
function sunKelvinFromAltitude(altRad) {
    const altDeg = MathUtils.radToDeg(altRad);
    const curve = [
        { alt: -6, K: 2400 }, // crépuscule 
        { alt: -3, K: 2800 },
        { alt: 0, K: 3000 }, // horizon
        { alt: 5, K: 3400 },
        { alt: 10, K: 4000 },
        { alt: 20, K: 5000 },
        { alt: 35, K: 5800 },
        { alt: 50, K: 6200 },
        { alt: 65, K: 6500 },
        { alt: 80, K: 6600 },
        { alt: 90, K: 6600 }, // zénith
    ];
    if (altDeg <= curve[0].alt) return curve[0].K;
    for (let i = 0; i < curve.length - 1; i++) {
        const a = curve[i], b = curve[i + 1];
        if (altDeg >= a.alt && altDeg <= b.alt) {
            const t = (altDeg - a.alt) / (b.alt - a.alt);
            return MathUtils.lerp(a.K, b.K, t);
        }
    }

    return curve[curve.length - 1].K;
}
function distanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // rayon moyen de la Terre en mètres
    const toRad = x => x * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance en mètres
}
