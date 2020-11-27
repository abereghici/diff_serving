const path = require('path');
const fs = require('fs-extra');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const pluginName = 'modern-build-plugin';
const safariFixScript = `(function(){var d=document;var c=d.createElement('script');if(!('noModule' in c)&&'onbeforeload' in c){var s=!1;d.addEventListener('beforeload',function(e){if(e.target===c){s=!0}else if(!e.target.hasAttribute('nomodule')||!s){return}e.preventDefault()},!0);c.type='module';c.src='.';d.head.appendChild(c);c.remove()}}())`;

class AssetsManager {
	constructor(path) {
		this.path = path;
	}

	get() {
		return JSON.parse(
			fs.readFileSync(this.path, 'utf-8')
		);
	}

	set(data = {}) {
		fs.mkdirpSync(path.dirname(this.path));
		fs.writeFileSync(this.path, JSON.stringify(data));
	}

	remove() {
		fs.removeSync(this.path);
	}

	hasAssets() {
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

	alterAssetTagGroups = ({plugin, bodyTags: body, headTags: head, ...rest}, cb) => {
		const assetsManager = this.createAssetManager(plugin);

		const currentAssets = plugin.options.inject === 'head' ? head : body;

		if (assetsManager.hasAssets()) {

			this.setAttributesToScripts(currentAssets);
			this.injectAssets(assetsManager.get(), currentAssets);

			assetsManager.remove();
		} else {

			const scripts = currentAssets.filter(a => a.tagName === 'script' && a.attributes);
			this.setAttributesToScripts(scripts);

			assetsManager.set(scripts);
		}

		cb();
	}


	beforeEmitHtml = (data) => {
		data.html = data.html.replace(/\snomodule="">/g, ' nomodule>');
	}

	createAssetManager = plugin => {
		const targetDir = this.compiler.options.output.path;
		const htmlName = path.basename(plugin.options.filename);
		const htmlPath = path.dirname(plugin.options.filename);

		const assetsPath = path.join(
			targetDir,
			htmlPath,
			`assets.${htmlName}.json`
		);

		return new AssetsManager(assetsPath);
	}

	setAttributesToScripts = scripts => scripts.forEach(script => {
		script.attributes = {
			...script.attributes,
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
	});

	injectAssets = (assets, target) => {
		const safariFixScriptTag = {
			tagName: 'script',
			closeTag: true,
			innerHTML: safariFixScript,
		}
		// Make our array look like [modern, script, legacy]
		if (this.options.mode === 'legacy') {
			target.unshift(...assets, safariFixScriptTag);
		} else {
			target.push(safariFixScriptTag, ...assets);
		}
		target.sort(a => a.tagName === 'script' ? 1 : -1);
	}
}

module.exports = ModernBuildPlugin;
