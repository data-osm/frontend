const float GAMMA = 2.2;
const float INV_GAMMA = 1.0 / GAMMA;

vec3 LINEARtoSRGB(vec3 color) {
    return pow(color, vec3(INV_GAMMA));
}

vec4 SRGBtoLINEAR(vec4 srgbIn) {
    return vec4(pow(srgbIn.xyz, vec3(GAMMA)), srgbIn.w);
}

vec4 getColorValue(sampler2DArray tMap, vec2 vUv, int textureId, float mask, vec3 tintColor) {
    vec3 color = mix(vec3(1), tintColor, mask);

    return texture(tMap, vec3(vUv, textureId * 4)) * vec4(tintColor, 1.0);
    // * vec4(color, 1.0)
}

vec3 getMaskValue(sampler2DArray tMap, vec2 vUv, int textureId) {
    return texture(tMap, vec3(vUv, textureId * 4 + 2)).xyz;
}

// Normal Mapping Without Precomputed Tangents
	// http://www.thetenthplanet.de/archives/1180

mat3 getTangentFrame(vec3 eye_pos, vec3 surf_norm, vec2 uv) {

    vec3 q0 = dFdx(eye_pos.xyz);
    vec3 q1 = dFdy(eye_pos.xyz);
    vec2 st0 = dFdx(uv.st);
    vec2 st1 = dFdy(uv.st);

    vec3 N = surf_norm; // normalized

    vec3 q1perp = cross(q1, N);
    vec3 q0perp = cross(N, q0);

    vec3 T = q1perp * st0.x + q0perp * st1.x;
    vec3 B = q1perp * st0.y + q0perp * st1.y;

    float det = max(dot(T, T), dot(B, B));
    float scale = (det == 0.0) ? 0.0 : inversesqrt(det);

    return mat3(T * scale, B * scale, N);

}

mat3 getTBN(vec3 N, vec3 p, vec2 uv) {
    /* get edge vectors of the pixel triangle */
    vec3 dp1 = dFdx(p);
    vec3 dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);

    /* solve the linear system */
    vec3 dp2perp = cross(dp2, N);
    vec3 dp1perp = cross(N, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

    /* construct a scale-invariant frame */
    float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
    return mat3(T * invmax, -B * invmax, N);
}

vec3 blendNormalRNM(vec3 n1, vec3 n2) {
    n1.z += 1.0;
    n2.xy = -n2.xy;

    return normalize(n1 * dot(n1, n2) - n2 * n1.z);
}

vec3 s(vec3 N, vec3 p, vec2 uv) {
    /* get edge vectors of the pixel triangle */
    vec3 dp1 = dFdx(p);
    vec3 dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);

    /* solve the linear system */
    vec3 dp2perp = cross(dp2, N);
    vec3 dp1perp = cross(N, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

    /* construct a scale-invariant frame */
    float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
    float s = (dot(cross(N, T * invmax), -B * invmax) < 0.0) ? -1.0 : 1.0;
    // float s = (dot(cross(N, * invmax), -B * invmax) < 0.0) ? -1.0 : 1.0;
    // return mat3(T * invmax, -B * invmax, N);
    return vec3(s * 0.5 + 0.5);
    // return s;
}

vec3 getNormalValue(int textureId, sampler2DArray tMap, vec3 normal, vec3 position, vec2 uv, float normalScale) {
    float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
    mat3 tbn = getTangentFrame(position, normal, uv);

    // #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

    // tbn[0] *= faceDirection;
    // tbn[1] *= faceDirection;

	// #endif

    vec3 normalValue = texture(tMap, vec3(uv, textureId)).xyz * 2.0 - 1.0;

    normalValue.xy *= normalScale;
    vec3 newNormal = normalize(tbn * normalValue);

    return newNormal;
}
vec3 getNormaWithVolumeValue(int textureId, sampler2DArray tMap, vec3 normal, vec3 position, vec2 uv, float normalScale, vec3 volumeNormal) {
    float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
    mat3 tbn = getTangentFrame(position, normal, uv);
    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

    tbn[0] *= faceDirection;
    tbn[1] *= faceDirection;

	#endif

    vec3 normalValue = texture(tMap, vec3(uv, textureId)).xyz * 2.0 - 1.0;
    vec3 normalVolumeValue = blendNormalRNM(volumeNormal * 2.0 - 1.0, normalValue);

    normalVolumeValue.xy *= normalScale;
    vec3 newNormal = normalize(tbn * normalVolumeValue);

    return newNormal;
}
