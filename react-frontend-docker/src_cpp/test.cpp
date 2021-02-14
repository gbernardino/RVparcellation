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

int main() {
    using milli = std::chrono::milliseconds;

    int nNodes = 938;
    int nSamples = 50000;
    int nTriangles = 1872;
    real *dA = readDFromFile("Data/dA.txt", nNodes);
    real *dP = readDFromFile("Data/dP.txt", nNodes);
    real *dT = readDFromFile("Data/dT.txt", nNodes);

    real *nodes = readDFromFile("Data/nodes.txt", 3 * nNodes);
    real *samples = readDFromFile("Data/samples.txt",3 * nSamples);
    real * signs = readDFromFile("Data/samplesSign.txt", nSamples);
    int * triangles = readIFromFile("Data/triangles.txt", nTriangles * 3);

    auto startSampling = std::chrono::high_resolution_clock::now();
    MeshSampler sampler(nodes,  nNodes, triangles, nTriangles);
    sampler.sample(nSamples, samples, signs);

    int count[3] = {0, 0, 0};
    auto start = std::chrono::high_resolution_clock::now();
    std::cout << "Total sampling " <<  std::chrono::duration_cast<milli>(start - startSampling).count()  << std::endl;

    countInterpolation( nNodes,  nodes, dA, dP, dT,  
                        nSamples, samples, signs, count);
    std::cout << count[0] << " " << count[1] << " " <<  count[2] << std::endl;
    auto end = std::chrono::high_resolution_clock::now();

    std::cout << "Total wo reading " <<  std::chrono::duration_cast<milli>(end - start).count()  << std::endl;

    free(dA);
    free(dP);
    free(dT);
    free(nodes);
    free(samples);
    free(signs);
}