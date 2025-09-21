float computeShadowMask() {
    float shadow = 1.0;

  #if defined(USE_SHADOWMAP) && (NUM_DIR_LIGHT_SHADOWS > 0)

    // Même convention que three-csm : vViewPosition.z < 0 devant la caméra
    float linearDepth = vViewPosition.z / (shadowFar - cameraNear);

    // Temporaires déclarés une seule fois (évite les redefinitions avec l’unroll)
    vec2 range;
    float center, closestEdge, margin, cmin, cmax, dist, ratio;
    bool last;

    #if defined(USE_CSM) && defined(CSM_CASCADES)

      // ----- Version avec fondu entre cascades (CSM_FADE) -----
      #if defined(CSM_FADE)
        #pragma unroll_loop_start
    for(int i = 0; i < NUM_DIR_LIGHTS; i++) {
          #if (UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS)
            #if (UNROLLED_LOOP_INDEX < CSM_CASCADES)

              // Fenêtre de cascade & marge de fondu, exactement comme three-csm
        range = CSM_cascades[i];                 // (x proche, y lointain) — valeurs négatives
        center = 0.5 * (range.x + range.y);
        closestEdge = (linearDepth < center) ? range.x : range.y;
        margin = 0.25 * (closestEdge * closestEdge);
        cmin = range.x - 0.5 * margin;
        cmax = range.y + 0.5 * margin;

        if(linearDepth >= cmin && (linearDepth < cmax || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1)) {
            dist = min(linearDepth - cmin, cmax - linearDepth);
            ratio = clamp(dist / margin, 0.0, 1.0);

                // Échantillonne l’ombre de la cascade i
            DirectionalLightShadow sh = directionalLightShadows[i];
            float s = getShadow(directionalShadowMap[i], sh.shadowMapSize, sh.shadowIntensity, sh.shadowBias, sh.shadowRadius, vDirectionalShadowCoord[i]);

                // Fondu spécial sur la dernière cascade si on s’en éloigne
            last = (UNROLLED_LOOP_INDEX == CSM_CASCADES - 1) && (linearDepth > center);
            float fade = last ? ratio : 1.0;
            s = mix(1.0, s, fade);

                // Mélange (approx. du mix de three-csm sur reflectedLight)
            float blendRatio = (UNROLLED_LOOP_INDEX != CSM_CASCADES - 1 || (UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 && linearDepth < center)) ? ratio : 1.0;

                // receiveShadow coupe tout si false
            shadow = mix(shadow, shadow * s, (receiveShadow) ? blendRatio : 0.0);
        }

            #else
              // Au-delà du nb de cascades (sécurité)
        DirectionalLightShadow sh = directionalLightShadows[i];
        float s = getShadow(directionalShadowMap[i], sh.shadowMapSize, sh.shadowIntensity, sh.shadowBias, sh.shadowRadius, vDirectionalShadowCoord[i]);
        shadow *= (receiveShadow) ? s : 1.0;
            #endif
          #endif
    }
        #pragma unroll_loop_end

      // ----- Version sans fondu entre cascades -----
      #else
        #pragma unroll_loop_start
    for(int i = 0; i < NUM_DIR_LIGHTS; i++) {
          #if (UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS)
            #if (UNROLLED_LOOP_INDEX < CSM_CASCADES)
        range = CSM_cascades[UNROLLED_LOOP_INDEX];
        if(linearDepth >= range.x && linearDepth < range.y) {
            DirectionalLightShadow sh = directionalLightShadows[i];
            float s = getShadow(directionalShadowMap[i], sh.shadowMapSize, sh.shadowIntensity, sh.shadowBias, sh.shadowRadius, vDirectionalShadowCoord[i]);
            shadow *= (receiveShadow) ? s : 1.0;
        }
            #else
        DirectionalLightShadow sh = directionalLightShadows[i];
        float s = getShadow(directionalShadowMap[i], sh.shadowMapSize, sh.shadowIntensity, sh.shadowBias, sh.shadowRadius, vDirectionalShadowCoord[i]);
        shadow *= (receiveShadow) ? s : 1.0;
            #endif
          #endif
    }
        #pragma unroll_loop_end
      #endif // CSM_FADE

    // ----- Pas de CSM : ombres directionnelles standard -----
    #else
      #pragma unroll_loop_start
    for(int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i++) {
        DirectionalLightShadow sh = directionalLightShadows[i];
        float s = getShadow(directionalShadowMap[i], sh.shadowMapSize, sh.shadowIntensity, sh.shadowBias, sh.shadowRadius, vDirectionalShadowCoord[i]);
        shadow *= (receiveShadow) ? s : 1.0;
    }
      #pragma unroll_loop_end
    #endif // USE_CSM

  #endif // USE_SHADOWMAP

    return shadow;
}

// float computeShadowMask() {
//     float shadow = 1.0;
//     vec2 r;
//   #if defined(USE_SHADOWMAP) && (NUM_DIR_LIGHT_SHADOWS > 0)
//     float linearDepth = vViewPosition.z / (shadowFar - cameraNear);

//     #if defined(USE_CSM) && defined(CSM_CASCADES)
//       #pragma unroll_loop_start
//     for(int i = 0; i < NUM_DIR_LIGHTS; i++) {
//         #if (UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS)
//           #if (UNROLLED_LOOP_INDEX < CSM_CASCADES)
//         r = CSM_cascades[i];
//         if(linearDepth >= r.x && linearDepth < r.y) {
//             DirectionalLightShadow sh = directionalLightShadows[i];
//             float s = getShadow(directionalShadowMap[i], sh.shadowMapSize, sh.shadowIntensity, sh.shadowBias, sh.shadowRadius, vDirectionalShadowCoord[i]);
//             shadow *= (receiveShadow) ? s : 1.0;
//         }
//           #else
//         DirectionalLightShadow sh = directionalLightShadows[i];
//         float s = getShadow(directionalShadowMap[i], sh.shadowMapSize, sh.shadowIntensity, sh.shadowBias, sh.shadowRadius, vDirectionalShadowCoord[i]);
//         shadow *= (receiveShadow) ? s : 1.0;
//           #endif
//         #endif
//     }
//       #pragma unroll_loop_end
//     #else
//       #pragma unroll_loop_start
//     for(int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i++) {
//         DirectionalLightShadow sh = directionalLightShadows[i];
//         float s = getShadow(directionalShadowMap[i], sh.shadowMapSize, sh.shadowIntensity, sh.shadowBias, sh.shadowRadius, vDirectionalShadowCoord[i]);
//         shadow *= (receiveShadow) ? s : 1.0;
//     }
//       #pragma unroll_loop_end
//     #endif
//   #endif

//     return shadow;
// }
