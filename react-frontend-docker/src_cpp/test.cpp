#include "definitions.hpp"
#include "rbf.hpp"
#include "meshSampler.hpp"
#include <chrono>
#include <iostream>
#include <fstream>
#include <emscripten.h>
//Needs the following header library https://github.com/mojocorp/geodesic
#include <geodesic/geodesic_algorithm_exact.h>




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


void closestDistance(geodesic::GeodesicAlgorithmExact& algorithm, geodesic::Mesh& mesh, std::vector<int>& idx, real *d) {
    std::vector<geodesic::SurfacePoint> all_sources(idx.size());
    for (int i = 0; i < all_sources.size(); ++i) {
        all_sources[i] = geodesic::SurfacePoint(&mesh.vertices()[idx[i]]);
    }
    algorithm.propagate(all_sources);

    for (unsigned i = 0; i < mesh.vertices().size(); ++i) {
        geodesic::SurfacePoint p(&mesh.vertices()[i]);
        double distance;
        unsigned best_source =algorithm.best_source(p, distance);
        d[i] = distance;
    }
}

extern "C" {
	EMSCRIPTEN_KEEPALIVE
    void geodesicComputation(real *nodes, int * triangles, int nNodes, int nTriangles, real *dA, real *dP, real *dT){

        std::vector<int>  apexId {906};
        std::vector<int>  pointsTricuspid{388, 389, 392, 393, 144, 540, 145, 538, 539, 422, 423, 38, 541, 49, 55, 328, 329, 332, 333, 87, 94, 100, 101, 103, 104, 105, 122, 123, 126, 127};
        std::vector<int>  pointsPulmonary {410, 411, 409, 408, 53, 64, 65, 66, 67, 68, 69, 83, 476, 477, 92, 478, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 479};

        //Generate the mesh
        std::vector<real>  pointsV(nodes, nodes + 3 * nNodes);
        std::vector<int>  trianglesV(triangles, triangles + 3 * nTriangles );
        std::cout << nNodes << " " << nTriangles << " " << trianglesV.size() << std::endl;
        geodesic::Mesh mesh;
        mesh.initialize_mesh_data(pointsV, trianglesV);

        geodesic::GeodesicAlgorithmExact algorithm(&mesh);

        closestDistance(algorithm, mesh, apexId, dA);
        closestDistance(algorithm, mesh, pointsPulmonary, dP);
        closestDistance(algorithm, mesh, pointsTricuspid, dT);

    }
}


void doParcellationSamplingBatch(MeshSampler& sampler, real *nodes, real*dA, real*dP, real*dT, int nNodes, int* triangles, int nTriangles, int nSamples, int * count) {
    real * samples = (real *) malloc(sizeof(real) * 3 * nSamples);
    real * signs = (real *) malloc(sizeof(real) *  nSamples);

    sampler.sample(nSamples, samples, signs);
    countInterpolation( nNodes,  nodes, dA, dP, dT,  
                        nSamples, samples, signs, count);
    free(samples);
    free(signs);
}


extern "C" {
	EMSCRIPTEN_KEEPALIVE
    void doParcellationSampling(real *nodes, real*dA, real*dP, real*dT, int nNodes, int* triangles, int nTriangles, int nSamples, real * res) {
        MeshSampler sampler(nodes,  nNodes, triangles, nTriangles);
        int count[3] = {0, 0, 0};

        while (nSamples > 0) {
            int nSamplesToProcess = std::min(nSamples, 1000);
            nSamples -= nSamplesToProcess;
            doParcellationSamplingBatch(sampler, nodes, dA, dP, dT, nNodes, triangles, nTriangles, nSamplesToProcess, count);
        }
        res[0] = sampler.volume;
        res[1] = real(count[0])/(count[0] + count[1] + count[2]);
        res[2] = real(count[1])/(count[0] + count[1] + count[2]);
        res[3] = real(count[2])/(count[0] + count[1] + count[2]);

    }
}

#ifdef MEMORY_CHECK
    using namespace emscripten;
    EMSCRIPTEN_BINDINGS(my_module) {
        function("doLeakCheck", &__lsan_do_recoverable_leak_check);
    }
#endif



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
    doParcellationSampling(nodes, dA, dP, dT,nNodes,triangles, nTriangles, nSamples, res);
    auto end = std::chrono::high_resolution_clock::now();
    std::cout << "Total time " <<  std::chrono::duration_cast<milli>(end - start).count()  << std::endl;

    std::cout <<"Vol: " << res[0] << std::endl;
    std::cout <<"Vol perc: " << res[1] << " "  << res[2] << " "  << res[3]   << std::endl;


    free(dA);
    free(dP);
    free(dT);
    free(nodes);
} 