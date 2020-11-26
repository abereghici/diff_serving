const path = require('path');
const fs = require('fs-extra');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const pluginName = 'modern-build-plugin';
const safariFixScript = `(function(){var d=document;var c=d.createElement('script');if(!('noModule' in c)&&'onbeforeload' in c){var s=!1;d.addEventListener('beforeload',function(e){if(e.target===c){s=!0}else if(!e.target.hasAttribute('nomodule')||!s){return}e.preventDefault()},!0);c.type='module';c.src='.';d.head.appendChild(c);c.remove()}}())`;

class Assets {
	constructor(path) {
		this.path = path;
	}

	read() {
		return JSON.parse(
			fs.readFileSync(this.path, 'utf-8')
		);
	}

	write(data = {}) {
		fs.mkdirpSync(path.dirname(this.path));
		fs.writeFileSync(this.path, JSON.stringify(data));
	}

	delete() {
		fs.removeSync(this.path);
	}

	exists() {
		return !!fs.existsSync(this.path);
	}
}

class ModernBuildPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;

		compiler.hooks.compilation.tap(pluginName, (compilation) => {

			HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tapAsync({
				name: pluginName,
				stage: Infinity
			}, this.alterAssetTagGroups);

			HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tap(pluginName, this.beforeEmitHtml);
		});
	}

	beforeEmitHtml = (data) => {
		data.html = data.html.replace(/\snomodule="">/g, ' nomodule>');
	}

	createAssets = plugin => {
		const targetDir = this.compiler.options.output.path;
		const htmlName = path.basename(plugin.options.filename);
		const htmlPath = path.dirname(plugin.options.filename);

		const assetsPath = path.join(
			targetDir,
			htmlPath,
			`assets.${htmlName}.json`
		);

		return new Assets(assetsPath);
	}

	setAttributesToScripts = body => body.forEach(({attributes, ...rest}) => ({
		...rest,
		attributes: {
			...attributes,
			...(this.options.mode === 'legacy' ?
				// Empty nomodule in legacy build
				{
					nomodule: ''
				} :
				// Module in the new build
				{
					type: 'module',
					crossOrigin: 'anonymous'
				})
		}
	}));


	alterAssetTagGroups = ({plugin, bodyTags: body, headTags: head, ...rest}, cb) => {
		const assets = this.createAssets(plugin);

		if (assets.exists()) {
			this.setAttributesToScripts(body);
			this.injectAssets(assets.read(), body);
			assets.delete();
		} else {
			const newBody = body.filter(tag => tag.tagName === 'script' && tag.attributes)
			this.setAttributesToScripts(
				newBody
			);
			assets.write(newBody);
		}

		cb();
	}

	injectAssets = (assets, body) => {
		const safariFixScriptTag = {
			tagName: 'script',
			closeTag: true,
			innerHTML: safariFixScript,
		}
		// Make our array look like [modern, script, legacy]
		if (this.options.mode === 'legacy') {
			body.unshift(...assets, safariFixScriptTag);
		} else {
			body.push(safariFixScriptTag, ...assets);
		}
	}
}

module.exports = ModernBuildPlugin;
