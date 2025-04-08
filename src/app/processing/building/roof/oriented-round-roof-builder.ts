import Vec2 from "../../math/vector2";
import OrientedRoofBuilder from "./oriented-roof-builder";

export default class OrientedRoundRoofBuilder extends OrientedRoofBuilder {
    protected splits: Vec2[] = [
        new Vec2(0, 0),
        new Vec2(0.00759612349389599, 0.17364817766693041),
        new Vec2(0.03015368960704584, 0.3420201433256688),
        new Vec2(0.0669872981077807, 0.5000000000000001),
        new Vec2(0.116977778440511, 0.6427876096865394),
        new Vec2(0.17860619515673037, 0.766044443118978),
        new Vec2(0.25, 0.8660254037844387),
        new Vec2(0.32898992833716567, 0.9396926207859084),
        new Vec2(0.41317591116653485, 0.984807753012208),
        new Vec2(0.5, 1),
        new Vec2(0.5868240888334652, 0.984807753012208),
        new Vec2(0.6710100716628343, 0.9396926207859084),
        new Vec2(0.75, 0.8660254037844387),
        new Vec2(0.8213938048432696, 0.766044443118978),
        new Vec2(0.883022221559489, 0.6427876096865394),
        new Vec2(0.9330127018922193, 0.5000000000000001),
        new Vec2(0.9698463103929542, 0.3420201433256688),
        new Vec2(0.9924038765061041, 0.17364817766693041),
        new Vec2(1, 0),
    ];
    protected isSmooth: boolean = true;
    protected respectDirection: boolean = false;
}