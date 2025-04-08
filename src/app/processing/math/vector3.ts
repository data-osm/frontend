import { Camera, Matrix4 } from "three";
import Vec2 from "./vector2";

export default class Vec3 {
    public x: number;
    public y: number;
    public z: number;

    public static Empty: Vec3 = new Vec3();

    public constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public get xz(): Vec2 {
        return new Vec2(this.x, this.z);
    }

    public get xy(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    public set(x: number, y: number, z: number): void {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public equals(v: Vec3): boolean {
        return this.x === v.x && this.y === v.y && this.z === v.z;
    }

    public normalize(): Vec3 {
        const length = Vec3.getLength(this);

        if (length > 1e-10) {
            this.x /= length;
            this.y /= length;
            this.z /= length;
        }

        return this;
    }

    public static add(v1: Vec3, v2: Vec3): Vec3 {
        return new Vec3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
    }

    public static sub(v1: Vec3, v2: Vec3): Vec3 {
        return new Vec3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }

    public static addScalar(v: Vec3, s: number): Vec3 {
        return new Vec3(v.x + s, v.y + s, v.z + s);
    }

    public static multiplyScalar(v: Vec3, s: number): Vec3 {
        return new Vec3(v.x * s, v.y * s, v.z * s);
    }

    public static multiplyPerComponent(v1: Vec3, v2: Vec3): Vec3 {
        return new Vec3(v1.x * v2.x, v1.y * v2.y, v1.z * v2.z);
    }

    public static applyMatrix4(v: Vec3, mat: Matrix4): Vec3 {
        const dst = new Vec3();
        const m = mat.elements;
        const w = 1 / (m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15]);
        dst.x = (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12]) * w;
        dst.y = (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13]) * w;
        dst.z = (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14]) * w;

        return dst;
    }

    public static normalize(v: Vec3): Vec3 {
        const length = Vec3.getLength(v);
        const dst = new Vec3();

        if (length > 1e-10) {
            dst.x = v.x / length;
            dst.y = v.y / length;
            dst.z = v.z / length;
        }

        return dst;
    }

    public static getLength(v: Vec3): number {
        return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
    }

    public static cross(a: Vec3, b: Vec3): Vec3 {
        const dst = new Vec3();
        dst.x = a.y * b.z - a.z * b.y;
        dst.y = a.z * b.x - a.x * b.z;
        dst.z = a.x * b.y - a.y * b.x;
        return dst;
    }

    public static dot(a: Vec3, b: Vec3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    public static distance(a: Vec3, b: Vec3): number {
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    public static lerp(v1: Vec3, v2: Vec3, amount: number): Vec3 {
        return new Vec3(
            (1 - amount) * v1.x + amount * v2.x,
            (1 - amount) * v1.y + amount * v2.y,
            (1 - amount) * v1.z + amount * v2.z
        );
    }

    public static nlerp(v1: Vec3, v2: Vec3, amount: number): Vec3 {
        return Vec3.lerp(v1, v2, amount).normalize();
    }

    public static project(v: Vec3, camera: Camera): Vec3 {
        const cameraSpace = Vec3.applyMatrix4(v, camera.matrixWorldInverse);
        return Vec3.applyMatrix4(cameraSpace, camera.projectionMatrix);
    }

    public static unproject(v: Vec3, camera: Camera, useWorldMatrix = true): Vec3 {
        const cameraSpace = Vec3.applyMatrix4(v, camera.projectionMatrixInverse);
        return Vec3.applyMatrix4(cameraSpace, useWorldMatrix ? camera.matrixWorld : camera.matrix);
    }

    public static rotateAroundAxis(v: Vec3, axis: Vec3, angle: number): Vec3 {
        // Rodrigues' rotation formula

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const t = 1 - cos;

        const cross = Vec3.cross(axis, v);
        const dot = Vec3.dot(axis, v);

        return new Vec3(
            v.x * cos + cross.x * sin + axis.x * dot * t,
            v.y * cos + cross.y * sin + axis.y * dot * t,
            v.z * cos + cross.z * sin + axis.z * dot * t
        );
    }

    public static clone(v: Vec3): Vec3 {
        return new Vec3(v.x, v.y, v.z);
    }

    public static toArray(v: Vec3): [number, number, number] {
        return [v.x, v.y, v.z];
    }
}
