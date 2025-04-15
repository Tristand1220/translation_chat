const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    entry: './server/public/app.js',
    output:{
        filename: 'bundle.js',
        path: path.resolve(__dirname,'server/public'),
    },
    mode: 'development',
    plugins : [
        new webpack.DefinePlugin({
            'DEEPSEEK_API_KEY': JSON.stringify(process.env.DEEPSEEK_API_KEY)
        })
    ]
};
