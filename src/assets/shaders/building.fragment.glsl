#include <common>
#include <envmap_common_pars_fragment>
#include <cube_uv_reflection_fragment> 

#include <building_common>

#define saturate( a ) clamp( a, 0.0, 1.0 )
#include <packing>
#include <fog_pars_fragment>
#include <shadowmap_pars_fragment> 
#include <lights_pars_begin>   
// #include <lights_lambert_pars_fragment>   
// #include <lights_physical_pars_fragment>

out highp vec4 fragColor;
#define gl_FragColor fragColor

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;
precision highp sampler2DArray;
precision highp sampler3D;

// In from vertex
in vec3 vColor;
in vec2 vUv;
in vec3 vNormal;
in vec3 vPosition;
in vec3 vWorldDirection;
in vec3 vViewPosition;
in vec3 VTransformedNormal;

flat in int vFeatureUid;
flat in int vTextureId;
flat in int vAddOutLine;

// Uniform
uniform sampler2DArray tMap;
// uniform sampler2DArray tMask;
uniform sampler2D tSkyTexture;

uniform sampler2D tNoise;
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float directionLightIntensity;
uniform float ambientLightIntensity;
uniform float opacity;
uniform int uFeatureUidSelected;
uniform int isRingActive;
uniform vec3 UdirectionLightDirection;

// Direction light

vec3 directionLightColor = vec3(1.0, 0.9237192625733872, 0.8585424303119573);

// Ambient light
// vec3 ambientLightColor = vec3(1.0, 1.0, 1.0);

// Environnement/sky light
float envIntensity = 0.9;

float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float num = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;

    float num = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return num / denom;
}
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

// Fresnel (Schlick)
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
#include <compute_shadow_mask>

void main() {
    if(vTextureId == 100) {
        // Is outline active for this position/pixels ?
        if(vAddOutLine == 0 || isRingActive == 0) {
            discard;
        }
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        return;
    }

    // GLOBAL VARIABLES
    vec3 directionLightDirection = UdirectionLightDirection;
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    ////// Building normals are not normalize
    vec3 normal = normalize(vNormal);
    ////// The normal from texture
    vec3 normalMap = getNormalValue(vTextureId, tMap, normal, vPosition, vUv);
    normal = normalMap;
    ////// The mask
    ///// mask.r => roughness, masg.g => metalness
    vec3 mask = getMaskValue(tMap, vUv, vTextureId);
    float metalness = mask.g;
    float roughness = mask.r;
    // float metalness = mask.z;
    // float roughness = mask.y;
    ////// The glow: glow.r == 0 => should have transparency, glow.r==1.0 => should not have transparency
    vec3 glow = texture(tMap, vec3(vUv, vTextureId * 4 + 3)).xyz;
    ////// Base Color
    vec4 baseColor = (getColorValue(tMap, vUv, vTextureId, mask.b, vColor));
    vec3 albedo = baseColor.xyz;

    ////// Noise for the windows
    float noiseTextureWidth = vec2(textureSize(tNoise, 0)).r;
    vec2 windowUV = vec2(floor((vUv.x + (floor(vUv.y) * 3.)) * 0.25), vUv.y) / noiseTextureWidth;
    float windowNoise = texture(tNoise, windowUV).r;
    float glowFactor = 1.0;
    vec3 WINDOW_GLOW_COLOR = vec3(1, 0.9, 0.7);
    float windowLightThreshold = clamp(-directionLightDirection.z * 5.0 + 0.2, 0.0, 1.0);
    float threshold = 1.0 - windowLightThreshold * 0.5;
    if(windowNoise <= threshold) {
        glowFactor = 0.0;
    } else {
        glowFactor = fract(windowNoise * 10.) * 0.6 + 0.4;
    }
    vec3 windowColor = glow * WINDOW_GLOW_COLOR * glowFactor;
    // albedo += windowColor * 1.0;

    vec4 diffuseColor = baseColor;
    ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
    float metalnessFactor = 1.0;
    float roughnessFactor = 1.0;
    // transformedNormal = VTransformedNormal;
    vec3 nonPerturbedNormal = normal;
    // accumulation
	// #include <lights_physical_fragment>
	// #include <lights_fragment_begin>
	// #include <lights_fragment_maps>
	// #include <lights_fragment_end>

    // vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
    // vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
    // gl_FragColor = vec4(totalDiffuse + totalSpecular, 1.0);
    // return;
    // Lights
    vec3 Lo = vec3(0.0);
    vec3 F0 = vec3(0.04);
    F0 = clamp(mix(F0, albedo, metalness), 0.0, 1.0);
    vec3 H = normalize(viewDirection + directionLightDirection);
    vec3 F = fresnelSchlick(max(dot(H, viewDirection), 0.0), F0);

    float G = GeometrySmith(normal, viewDirection, directionLightDirection, roughness);
    float NDF = DistributionGGX(normal, H, roughness);
    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * max(dot(normal, viewDirection), 0.0) * max(dot(normal, directionLightDirection), 0.0) + 0.0001;
    vec3 specular = numerator / denominator;
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metalness;

    float NdotL = max(dot(normal, directionLightDirection), 0.0);
    Lo += (kD * albedo / PI + specular) * directionLightColor * directionLightIntensity * NdotL;

    vec3 ambient = vec3(ambientLightIntensity) * albedo * vec3(1.0, 1.0, 1.0);
    vec3 color = ambient + Lo;

    // Env/Sky  
    vec3 reflection = reflect(-viewDirection, normal);
    reflection = normalize(mix(reflection, normal, roughness * roughness));
    reflection = inverseTransformDirection(reflection, viewMatrix);
    vec3 envCol = textureCubeUV(tSkyTexture, reflection, roughness).rgb * albedo * glow.r * envIntensity;

    // Get shadow mask
    float shadow = computeShadowMask();
    vec3 shadowTint = vec3(0.0, 0.0, 0.0);
    float atten = 1.0 - (1.0 - shadow) * 0.6;
    vec3 shade = mix(vec3(1.0), shadowTint, 1.0 - atten);
    // gl_FragColor = vec4(albedo, 1.0);

    // Final
    gl_FragColor = vec4((envCol + color) * shade, 1.0);
    if(uFeatureUidSelected == vFeatureUid) {
        gl_FragColor = gl_FragColor * vec4(1.0, 0.0, 0.0, 0.4);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
