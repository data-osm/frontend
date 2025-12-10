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

#ifdef USE_TRANSMISSION

varying vec3 vWorldPosition;

#endif

#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

float displacementScale = 4.0;
float displacementBias = 0.0;

void main() {

	mat3 nWorld = transpose(inverse(mat3(modelMatrix)));
	vec3 modelNormal = nWorld * normal;
	vModelNormal = modelNormal.xyz;

	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>

	vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);
	vModelPosition = modelPosition.xyz;

	#include <morphtarget_vertex>
	#include <skinning_vertex>
	// #include <displacementmap_vertex> 

	// #include <project_vertex>

	vec4 mvPosition = vec4(transformed, 1.0);
	mvPosition = modelViewMatrix * mvPosition;
	vec4 clip = projectionMatrix * mvPosition;

	gl_Position = clip;

	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = -mvPosition.xyz;

	vColor = color;
	vTextureId = int(textureId);
	vUv = uv;
	vZIndex = zIndex;

	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

#ifdef USE_TRANSMISSION

	vWorldPosition = worldPosition.xyz;

#endif
}