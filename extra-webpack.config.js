module.exports = {
    module: {
        rules: [
            {
                test: /\.(glsl|vs|fs|vert|frag)$/i,
                exclude: /node_modules/,
                use: [{ loader: 'ts-shader-loader' }]
            }
        ]
    }
};
