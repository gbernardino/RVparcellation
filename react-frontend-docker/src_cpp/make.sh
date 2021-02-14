DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

MODULE_NAME=InterpolateSampling
OUTPUT_JS=interpolateSampling.js
OUTPUT_WASM=interpolateSampling.wasm

# Ugly, better use CMAKE or other tool
emcc *.cpp \
	-o $OUTPUT_JS \
	-s WASM=1 \
	-s 'EXPORT_NAME="$MODULE_NAME"' \
	-s EXTRA_EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] \
	-s MODULARIZE=1 \
	-s EXPORTED_FUNCTIONS="['_free', '_malloc']" \
	-O3 \
	-I/Users/gbernardino/opt/anaconda3/pkgs/eigen-3.3.7-h04f5b5a_0/include/eigen3 \
	-s INITIAL_MEMORY=104857600 \
	-s ASSERTIONS=1

# disable eslint
# Copied from internet 
sed -i.old '1s;^;\/* eslint-disable *\/;' $OUTPUT_JS

#sed -i.old "s|import.meta.url|'/${OUTPUT_WASM}'|" $OUTPUT_JS

#sed -i.old "s|self.location.href|window.self.location.href|" $OUTPUT_JS

#sed -i.old "s|var dataURIPrefix =|//var dataURIPrefix =|" $OUTPUT_JS
#sed -i.old "s|function isDataURI|/\*\nfunction isDataURI|g" $OUTPUT_JS
#sed -i.old "s|var fileURIPrefix|\*/\nvar fileURIPrefix|g" $OUTPUT_JS


#sed -i.old "s|var wasmBinaryFile = '${OUTPUT_WASM}'|const wasmBinaryFile = '/${OUTPUT_WASM}'|" $OUTPUT_JS
#sed -i.old "s|if (!isDataURI(wasmBinaryFile|/*\nif (!isDataURI(wasmBinaryFile|g" $OUTPUT_JS
#sed -i.old "s|// Create the wasm instance|*/\n\n \\
#const getBinaryPromise = () => new Promise((resolve, reject) => { \\
#	fetch(wasmBinaryFile, { credentials: 'same-origin' }) \\
#	.then( \\
#		response => { \\
#			if (!response['ok']) { \\
#				throw \"failed to load wasm binary file at '\" + wasmBinaryFile + \"'\"; \\
#			} \\
#			return response['arrayBuffer'](); \\
#		} \\
#	) \\
#	.then(resolve) \\
#	.catch(reject); \\
#}); \\
#\n\n\/\/ Create the wasm instance|g" $OUTPUT_JS


#sed -i.old "s|!isDataURI(wasmBinaryFile) |// !isDataURI(wasmBinaryFile) |g" $OUTPUT_JS

mv $OUTPUT_JS ../src/
mv $OUTPUT_WASM ../src/
rm "$OUTPUT_JS.old"

