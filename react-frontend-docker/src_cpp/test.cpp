#include "definitions.hpp"
#include "rbf.hpp"
#include "meshSampler.hpp"
#include <chrono>
#include <iostream>
#include <fstream>

real* readDFromFile(std::string s, int n){
    std::fstream fs;
    real * res = (real *) malloc(n * sizeof(real));
    fs.open (s, std::fstream::in);
    for(int i = 0; i < n; ++i)
        fs >> res[i];
    return res;
}

int* readIFromFile(std::string s, int n){
    std::fstream fs;
    int * res = (int *) malloc(n * sizeof(int));
    fs.open (s, std::fstream::in);
    for(int i = 0; i < n; ++i)
        fs >> res[i];
    return res;
}


void doParcellationSamplint(real *nodes, real*dA, real*dP, real*dT, int nNodes, int* triangles, int nTriangles, int nSamples, real * res) {

    real * samples = (real *) malloc(sizeof(real) * 4 * nSamples);
    real * signs = (real *) malloc(sizeof(real) *  nSamples);
    int count[3] = {0, 0, 0};

    MeshSampler sampler(nodes,  nNodes, triangles, nTriangles);
    sampler.sample(nSamples, samples, signs);
    countInterpolation( nNodes,  nodes, dA, dP, dT,  
                        nSamples, samples, signs, count);
    res[0] = sampler.volume;
    res[1] = real(count[0])/(count[0] + count[1] + count[2]);
    res[2] = real(count[1])/(count[0] + count[1] + count[2]);
    res[3] = real(count[2])/(count[0] + count[1] + count[2]);
    free(samples);
    free(signs);
}


int main() {
    using milli = std::chrono::milliseconds;

    int nNodes = 938;
    int nSamples = 50000;
    int nTriangles = 1872;
    real *dA = readDFromFile("Data/dA.txt", nNodes);
    real *dP = readDFromFile("Data/dP.txt", nNodes);
    real *dT = readDFromFile("Data/dT.txt", nNodes);

    real *nodes = readDFromFile("Data/nodes.txt", 3 * nNodes);
    int * triangles = readIFromFile("Data/triangles.txt", nTriangles * 3);

    real res[4];
    auto start = std::chrono::high_resolution_clock::now();
    MeshSampler sampler(nodes,  nNodes, triangles, nTriangles);
    doParcellationSamplint(nodes, dA, dP, dT,nNodes,triangles, nTriangles, nSamples, res);
    auto end = std::chrono::high_resolution_clock::now();
    std::cout << "Total time " <<  std::chrono::duration_cast<milli>(end - start).count()  << std::endl;

    std::cout <<"Vol: " << res[0] << std::endl;
    std::cout <<"Vol perc: " << res[1] << " "  << res[2] << " "  << res[3]   << std::endl;


    free(dA);
    free(dP);
    free(dT);
    free(nodes);
}