import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.aurum.rust-deck.sdPlugin";

/**
 * Suppress known-harmless warnings from bundled node_modules (jimp deps).
 * @param {import('rollup').RollupWarning} warning
 * @param {(w: import('rollup').RollupWarning) => void} warn
 */
function onwarn(warning, warn) {
	// Circular deps inside node_modules are fine at Node.js runtime
	if (warning.code === "CIRCULAR_DEPENDENCY" && warning.ids?.every(id => id.includes("node_modules"))) return;
	// eval() inside file-type is intentional (require shim for webpack compat)
	if (warning.code === "EVAL" && warning.id?.includes("node_modules")) return;
	warn(warning);
}

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
	input: "src/plugin.ts",
	onwarn,
	output: {
		file: `${sdPlugin}/bin/plugin.js`,
		sourcemap: isWatching,
		sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
			return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
		}
	},
	plugins: [
		{
			name: "watch-externals",
			buildStart: function () {
				this.addWatchFile(`${sdPlugin}/manifest.json`);
			},
		},
		typescript({
			mapRoot: isWatching ? "./" : undefined
		}),
		nodeResolve({
			browser: false,
			exportConditions: ["node"],
			preferBuiltins: true
		}),
		json(),
		commonjs(),
		!isWatching && terser(),
		{
			name: "emit-module-package-file",
			generateBundle() {
				this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
			}
		}
	]
};

export default config;
