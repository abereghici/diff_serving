/* eslint-env node */

/**
 * References
 * https://calendar.perfplanet.com/2018/doing-differential-serving-in-2019/
 * https://github.com/malchata/differential-serving/blob/main/package.json
 * https://medium.com/hackernoon/the-100-correct-way-to-split-your-chunks-with-webpack-f8a9df5b7758
 * https://habr.com/ru/company/constanta/blog/430950/
 */

// Built-ins
const path = require("path");

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModernBuildPlugin = require("./ModernBuildPlugin");

const mode = process.env.NODE_ENV === "production" ? "production" : "development";

const src = (...args) => path.join(__dirname, "src", ...args);
const dist = (...args) => path.join(__dirname, "dist", ...args);

const configFactory = bundleType => {

	const fileName = mode === "development" ?
		`js/${bundleType === 'legacy' ? 'es5.' : ''}[name].js` :
		`js/${bundleType === 'legacy' ? 'es5.' : ''}[name].[chunkhash:8].js`

	return {
		mode,
		name: bundleType,
		devtool: "source-map",
		entry: src("index.js"),
		output: {
			filename: fileName,
			chunkFilename: fileName,
			path: dist(),
			publicPath: "/"
		},
		module: {
			rules: [
				{
					test: /\.m?js$/i,
					exclude: /node_modules/i,
					use: [
						{
							loader: "babel-loader",
							options: {
								envName: bundleType
							}
						}
					]
				}
			]
		},
		plugins: [
			new BundleAnalyzerPlugin({
				analyzerMode: 'static',
				reportFilename: `${bundleType}.report.html`,
				openAnalyzer: false,
			}),
			new HtmlWebpackPlugin({
				filename: 'index.html',
				inject: 'body',
				scriptLoading: "blocking"
			}),
			new ModernBuildPlugin({
				mode: bundleType
			}),
		]
	}
}

module.exports = [
	configFactory('legacy'),
	configFactory('modern')
];
