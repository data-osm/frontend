#define STANDARD

varying vec3 vViewPosition;

// in
attribute vec3 color;
attribute float textureId;
attribute float zIndex;

// Out
varying vec3 vColor;
varying vec2 vUv;
varying vec3 vModelNormal;
varying vec3 vModelPosition;
flat varying int vTextureId;
flat varying float vZIndex;
flat varying float vDepth;

#ifdef USE_TRANSMISSION

varying vec3 vWorldPosition;

#endif

void main() {

	mat3 nWorld = transpose(inverse(mat3(modelMatrix)));
	vec3 modelNormal = nWorld * normal;
	vModelNormal = modelNormal.xyz;

	vec3 transformed = vec3(position);

	vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);
	vModelPosition = modelPosition.xyz;

	vec4 mvPosition = vec4(transformed, 1.0);
	mvPosition = modelViewMatrix * mvPosition;
	vec4 clip = projectionMatrix * mvPosition;

	gl_Position = clip;
	vViewPosition = -mvPosition.xyz;

	vColor = color;
	vTextureId = int(textureId);
	vUv = uv;

}