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

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;
precision highp sampler2DArray;
precision highp sampler3D;

// in
attribute vec3 color;
attribute float textureId;
attribute int aFeatureUid;
attribute int aAddOutLine;

// Out
out vec3 vColor;
out vec2 vUv;
out vec3 vPosition;
out vec3 vWorldDirection;
out vec3 vViewPosition;
out vec3 VTransformedNormal;

flat out int vFeatureUid;
flat out int vTextureId;
flat out int vAddOutLine;

// uniform 
uniform float fogNear;
uniform float fogFar;

void main() {

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
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    // Out
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vPosition = modelPosition.xyz;

  mat3 nWorld = transpose(inverse(mat3(modelMatrix)));
  vec3 modelNormal = nWorld * normal;
  vNormal = modelNormal.xyz;

    // vWorldDirection = transformDirection(position, modelMatrix);

  vUv = uv;

  vColor = color;

  vTextureId = int(textureId);

  vFeatureUid = aFeatureUid;

  vAddOutLine = aAddOutLine;

  vViewPosition = -mvPosition.xyz;

  // vec3 transformedNormal = normalize(normalMatrix * normal);
  VTransformedNormal = transformedNormal;
    #include <worldpos_vertex>
    #include <shadowmap_vertex> 
    #include <fog_vertex>

}