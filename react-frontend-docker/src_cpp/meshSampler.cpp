
#include "definitions.hpp"
#include "meshSampler.hpp"
#include <vector>
#include <cmath> 

inline real volTetra(real * p1, real * p2, real * p3, real * p4){
    real a1, a2,a3,b1,b2,b3,c1,c2,c3;
    a1 = p1[0] - p2[0]; 
    a2 = p1[1] - p2[1];
    a3 = p1[2] - p2[2];

    b1 = p2[0] - p3[0]; 
    b2 = p2[1] - p3[1];
    b3 = p2[2] - p3[2];

    c1 = p3[0] - p4[0]; 
    c2 = p3[1] - p4[1];
    c3 = p3[2] - p4[2];

    return (a1 * (b2 * c3 - b3 * c2) -
            b1 * (a2 * c3 - a3 * c2) +
            c1 * (a2 * b3 - a3 * b2))/6;

}

MeshSampler::MeshSampler(real * coordinates, int nPoints, int  * triangles, int nCells) {
    //copy data
    this->coordinates = coordinates;
    this->nPoints = nPoints;
    this->triangles = triangles;
    this->nCells = nCells;

    //Compute mean
    for(int i = 0; i < nPoints; ++i) {
        this->mean[0] += coordinates[3*i + 0];
        this->mean[1] += coordinates[3*i + 1];
        this->mean[2] += coordinates[3*i + 2];

    }
    this->mean[0] /= nPoints;
    this->mean[1] /= nPoints;
    this->mean[2] /= nPoints;

    //Compute volumes and samplers
    std::vector<real> volumes(nCells);
    this->signTetra = (real *) malloc( nCells * sizeof(real));
    this->volume = 0;
    this->absVolume = 0;
    for(int i = 0; i < nCells; ++i) {
        real vol = volTetra(coordinates + 3 * triangles[3 *i +0],
                            coordinates + 3 * triangles[3 *i +1],
                            coordinates + 3 * triangles[3 *i +2],
                            mean );
        this->volume += vol;
        volumes[i] = std::abs(vol);
        this->absVolume += volumes[i];
        this->signTetra[i] = 1 ? vol > 0 : -1;
    }
    this->distribution = new std::discrete_distribution<>(volumes.begin(), volumes.end());

}

void MeshSampler::sampleTetrahedralCoordinates(int nSamples, real* outCoords) {

    std::mt19937_64 rng;
    // initialize the random number generator with time-dependent seed
    uint64_t timeSeed = std::chrono::high_resolution_clock::now().time_since_epoch().count();
    std::seed_seq ss{uint32_t(timeSeed & 0xffffffff), uint32_t(timeSeed>>32)};
    rng.seed(ss);

    // initialize a uniform distribution between 0 and 1
    std::uniform_real_distribution<real> unif(0, 1);
    for(int i = 0; i < nSamples *4; ++i) {
        outCoords[i] = - std::log(real(unif(rng)));
    }
    for(int i = 0; i < nSamples *4; i += 4) {
        real total = outCoords[i] + outCoords[i + 1] + outCoords[i + 2] + outCoords[i + 3];
        outCoords[i] /= total;
        outCoords[i + 1] /= total;
        outCoords[i +2] /= total;
        outCoords[i +3] /= total;
    }
}


void MeshSampler::sample(int nSamples, real* outPoints , real* outSigns) {
    std::default_random_engine generator;
    real *  baricentric= (real *) malloc(sizeof(real) * nSamples *4);
    this->sampleTetrahedralCoordinates(nSamples, baricentric);
    for(int i = 0; i < nSamples; ++ i){
        //sample cell
        int iTetra = this->distribution->operator()(generator);
        outSigns[i] = this->signTetra[iTetra];
        int * t = this->triangles + 3 * iTetra;
        outPoints[3*i + 0] = baricentric[4*i + 0] * this->coordinates[3*t[0]] + 
                             baricentric[4*i + 1] * this->coordinates[3*t[1]] + 
                             baricentric[4*i + 2] * this->coordinates[3*t[2]] + 
                             baricentric[4*i + 3] * this->mean[0];

        outPoints[3*i + 1] = baricentric[4*i + 0] * this->coordinates[3*t[0] + 1] + 
                             baricentric[4*i + 1] * this->coordinates[3*t[1] + 1] + 
                             baricentric[4*i + 2] * this->coordinates[3*t[2] + 1] + 
                             baricentric[4*i + 3] * this->mean[1];

        outPoints[3*i + 2] = baricentric[4*i + 0] * this->coordinates[3*t[0] + 2]  + 
                             baricentric[4*i + 1] * this->coordinates[3*t[1] + 2] + 
                             baricentric[4*i + 2] * this->coordinates[3*t[2] + 2] + 
                             baricentric[4*i + 3] * this->mean[2];

    }
    free(baricentric);
}

MeshSampler::~MeshSampler(){
    free(this->signTetra);
    delete this->distribution;
}