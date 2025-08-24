vec4 getColorValue(sampler2DArray tMap, vec2 vUv, int textureId, float mask, vec3 tintColor) {
    vec3 color = mix(vec3(1), tintColor, mask);
    return texture(tMap, vec3(vUv, textureId * 4)) * vec4(color, 1.0);
}

vec3 getMaskValue(sampler2DArray tMap, vec2 vUv, int textureId) {
    return texture(tMap, vec3(vUv, textureId)).xyz;
}

mat3 getTBN(vec3 normal, vec3 position, vec2 uv) {
                    // Get edge vectors of the pixel triangle
    vec3 dp1 = dFdx(position);  // Partial derivative of position with respect to x
    vec3 dp2 = dFdy(position);  // Partial derivative of position with respect to y
    vec2 duv1 = dFdx(uv);       // Partial derivative of UV with respect to x
    vec2 duv2 = dFdy(uv);       // Partial derivative of UV with respect to y

                    // Solve the linear system to compute tangent and bitangent vectors
    vec3 tangent = normalize(duv2.y * dp1 - duv1.y * dp2);  // Compute Tangent (T)
    vec3 bitangent = normalize(duv2.x * dp1 - duv1.x * dp2); // Compute Bitangent (B)

                    // Ensure that the tangent, bitangent, and normal form a right-handed coordinate system
    tangent = normalize(tangent);
    bitangent = normalize(cross(normal, tangent));  // Use cross product to get a corrected bitangent

                    // Construct the TBN matrix with scale-invariance
    return mat3(tangent, bitangent, normal);  // TBN matrix with Z-up normal
}

vec3 getNormalValue(int textureId, sampler2DArray tMap, vec3 normal, vec3 position, vec2 uv) {
    mat3 tbn = getTBN(normal, position, vec2(uv.x, 1. - uv.y));
    vec3 mapValue = texture(tMap, vec3(uv, textureId * 4 + 1)).xyz * 2. - 1.;
    vec3 normalValue = normalize(tbn * mapValue);

    // normal *= float(gl_FrontFacing) * 2. - 1.;

    return normalValue;
}
