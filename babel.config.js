/* eslint-env node */

const modern = {
	presets: [
		[
			"@babel/preset-env", {
			targets: {
				esmodules: true
			}
		}
		],
	],
	plugins: ['@babel/plugin-syntax-dynamic-import'],
};

const legacy = {
	presets: [
		[
			"@babel/preset-env", {
			corejs: 3,
			useBuiltIns: "usage",
		}
		],
	],
	plugins: ['@babel/plugin-syntax-dynamic-import'],
};

module.exports = {
	env: {
		modern,
		legacy
	}
};
