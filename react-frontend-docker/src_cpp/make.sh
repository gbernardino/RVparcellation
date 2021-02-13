MODULE_NAME=adder
OUTPUT_JS=adder_plumbing.js
OUTPUT_WASM=adder_plumbing.wasm

emcc ${MODULE_NAME}.cpp \
	-o $OUTPUT_JS \
	-g1 \
	-s WASM=1 \
	-s MODULARIZE=1 \
	-s EXPORT_ES6=1 \
	-s 'EXPORT_NAME="$MODULE_NAME"' \
	-s EXTRA_EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] \
	-s 'ENVIRONMENT="web"' \
	-s EXPORTED_FUNCTIONS="['_free', '_malloc']"


# disable eslint
sed -i.old '1s;^;\/* eslint-disable *\/;' $OUTPUT_JS

sed -i.old "s|import.meta.url|'/${OUTPUT_WASM}'|" $OUTPUT_JS

sed -i.old "s|self.location.href|window.self.location.href|" $OUTPUT_JS

sed -i.old "s|var dataURIPrefix =|//var dataURIPrefix =|" $OUTPUT_JS
sed -i.old "s|function isDataURI|/\*\nfunction isDataURI|g" $OUTPUT_JS
sed -i.old "s|var fileURIPrefix|\*/\nvar fileURIPrefix|g" $OUTPUT_JS


sed -i.old "s|var wasmBinaryFile = '${OUTPUT_WASM}'|const wasmBinaryFile = '/${OUTPUT_WASM}'|" $OUTPUT_JS
sed -i.old "s|if (!isDataURI(wasmBinaryFile|/*\nif (!isDataURI(wasmBinaryFile|g" $OUTPUT_JS
sed -i.old "s|// Create the wasm instance|*/\n\n \\
const getBinaryPromise = () => new Promise((resolve, reject) => { \\
	fetch(wasmBinaryFile, { credentials: 'same-origin' }) \\
	.then( \\
		response => { \\
			if (!response['ok']) { \\
				throw \"failed to load wasm binary file at '\" + wasmBinaryFile + \"'\"; \\
			} \\
			return response['arrayBuffer'](); \\
		} \\
	) \\
	.then(resolve) \\
	.catch(reject); \\
}); \\
\n\n\/\/ Create the wasm instance|g" $OUTPUT_JS


sed -i.old "s|!isDataURI(wasmBinaryFile) |// !isDataURI(wasmBinaryFile) |g" $OUTPUT_JS



mv $OUTPUT_JS ../src/
mv $OUTPUT_WASM ../public/

