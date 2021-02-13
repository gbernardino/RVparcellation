

#include <emscripten.h>

extern "C" {
	EMSCRIPTEN_KEEPALIVE
		int adder(int a, int b) {
			return a+b;
		}

}


extern "C" {
	EMSCRIPTEN_KEEPALIVE
		int sumArray(int* a, int length) {
			int total = 0;
			for (int i = 0; i < length; ++i){
				total += a[i];
			}
			return total;
		}

}


