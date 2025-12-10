import Vec2 from "../../math/vector2";
import IntersectionPolygonBuilder, { Segment } from "./IntersectionPolygonBuilder";
import LinkedVertex from "./LinkedVertex";
import Road from "./Road";

export interface IntersectionDirection {
	road: Road;
	vertex: LinkedVertex;
	trimmedEnd?: Vec2;
}

export default class Intersection {
	public center: Vec2;
	public directions: IntersectionDirection[] = [];
	public userData: Record<string, any> = {};

	public constructor(center: Vec2) {
		this.center = center;
	}

	public addDirection(road: Road, vertex: LinkedVertex): void {
		const direction: IntersectionDirection = {
			road,
			vertex
		};

		this.directions.push(direction);
	}

	public getPolygon(): Vec2[] {
		const builder = new IntersectionPolygonBuilder(this.center);
		const segments: Segment[] = [];

		for (const direction of this.directions) {
			const segment = builder.addDirection(direction.vertex.vector, direction.road.width);

			segments.push(segment);
		}

		const polygon = builder.getPolygon();

		for (let i = 0; i < segments.length; i++) {
			this.directions[i].trimmedEnd = segments[i].getTrimmedEnd();
		}

		return polygon;
	}
}