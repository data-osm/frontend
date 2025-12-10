varying vec2 vUv;
flat varying int vTextureId;

uniform sampler2DArray tMapp;

void main() {
	int layer = (vTextureId) * 3;
	vec4 color = texture(tMapp, vec3(vUv, layer));
	gl_FragColor = color;

}