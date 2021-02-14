#pragma once

#include "definitions.hpp"
#include <random>

class MeshSampler{
        // mesh information
        real * coordinates;
        int * triangles;
        int nPoints;
        int nCells;
        real mean[3] = {0,0,0};
        // sampling information
        real * signTetra;
        

        real absVolume;
        std::discrete_distribution<> *distribution;

    public:
        real volume;

        MeshSampler(real * coordinates, int nPoints, int  * triangles, int nCells);
        void sample(int nSamples, real* outPoints, real* outSigns) ;
        void sampleTetrahedralCoordinates(int nSamples, real* outCoords);
        ~ MeshSampler ();
};
