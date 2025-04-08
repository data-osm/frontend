import Vec2 from "../math/vector2";
import CurvedRoofBuilder from "./roof/curved-roof-builder";

export default class PyramidalRoofBuilder extends CurvedRoofBuilder {
    protected splits: Vec2[] = [
        new Vec2(0, 1),
        new Vec2(1, 0)
    ];
    protected isEdgy = true;
}