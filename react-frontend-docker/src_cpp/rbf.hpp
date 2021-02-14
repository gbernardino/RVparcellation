#pragma once

#include "definitions.hpp"

void countInterpolation(const int nNodes, real * points, real * dA, real * dP, real * dT,  
                        const int nSamples , real * sampleCoordinates, real * signSamples,
                        int * count);

class RBF{
    real * Kx_array;
    MatrixReal Kx;
    ObservationMatrix3 f;
    real * X;
    int n;

    public:
        RBF(real * X, real * Kx_array, int n , ObservationMatrix3& f);
        MatrixReal predict(const real*, real* , int);

};
