import Vec2 from "../math/vector2";
import OrientedRoofBuilder from "./roof/oriented-roof-builder";

export default class OrientedGabledRoofBuilder extends OrientedRoofBuilder {
    protected splits: Vec2[] = [
        new Vec2(0, 0),
        new Vec2(0.5, 1),
        new Vec2(1, 0),
    ];
    protected isSmooth: boolean = false;
    protected respectDirection: boolean = false;
}