DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

MODULE_NAME=InterpolateSampling
OUTPUT_JS=interpolateSampling.js
OUTPUT_WASM=interpolateSampling.wasm
#export NODE_OPTIONS="--max-old-space-size=8192"

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
	-I/Users/gbernardino/geodesic/include \
	-s ALLOW_MEMORY_GROWTH \
	-s TOTAL_MEMORY=278396928 

#	-g2 \
#	--bind \
#	-fsanitize=address
	
# disable eslint
# Copied from internet 
sed -i.old '1s;^;\/* eslint-disable *\/;' $OUTPUT_JS

mv $OUTPUT_JS ../src/
mv $OUTPUT_WASM ../src/
rm "$OUTPUT_JS.old"

