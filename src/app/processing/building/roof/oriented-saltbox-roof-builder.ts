import Vec2 from "../../math/vector2";
import OrientedRoofBuilder from "./oriented-roof-builder";

export default class OrientedSaltboxRoofBuilder extends OrientedRoofBuilder {
    protected splits: Vec2[] = [
        new Vec2(0, 0),
        new Vec2(0.7, 1),
        new Vec2(1, 0.2),
    ];
    protected isSmooth: boolean = false;
    protected respectDirection: boolean = true;
}