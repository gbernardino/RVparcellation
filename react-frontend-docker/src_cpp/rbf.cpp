#include <Eigen/Dense>
#include <math.h>  
#include <Eigen/Core>
#include <iostream>
#include <fstream>
#include <chrono>


double euclidean_distance( const double *u, const double *v,
                    const int n)
{
    double s = 0.0;
    int i;

    for (i = 0; i < n; ++i) {
        const double d = u[i] - v[i];
        s += (d * d);
    }
    return sqrt(s);
}


double *  cdist_euclidean(const double *XA, const double *XB,  double *dm,
                  const int num_rowsA, const int num_rowsB,
                 const int num_cols)
{
    int i, j;
    double* dmiter = dm;
    for (i = 0; i < num_rowsA; ++i) {
        const double *u = XA + (num_cols * i);
        for (j = 0; j < num_rowsB; ++j, ++dmiter) {
            const double *v = XB + (num_cols * j);
            *dmiter = euclidean_distance( u, v, num_cols);
        }
    }
    return dm;
}




typedef Eigen::Matrix<double, Eigen::Dynamic, 3, Eigen::RowMajor> ObservationMatrix3;


double Sqrt(double x) // the functor we want to apply
{
    return std::sqrt(x);
}

Eigen::MatrixXd pDist2(const ObservationMatrix3& X, const ObservationMatrix3& Y){
    auto D = ( (X * Y.transpose() * -2
        ).colwise() + X.transpose().colwise().squaredNorm().transpose() 
        ).rowwise() + Y.transpose().colwise().squaredNorm();        
    return D.unaryExpr(&Sqrt);
}

class RBF{
    double * Kx_array;
    Eigen::MatrixXd Kx;
    ObservationMatrix3 f;
    double * X;
    int n;

    public:
        RBF(double * X, double * Kx_array, int n , ObservationMatrix3& f);
        Eigen::MatrixXd predict(const double*, double* , int);

};


RBF::RBF(double * X,   double* Kx_array,  int n,  ObservationMatrix3& f ){
    this->Kx_array = Kx_array;
    cdist_euclidean(X,X ,Kx_array,  n, n, 3);
    this->Kx = Eigen::Map<Eigen::MatrixXd>(Kx_array, n, n);
    this->f = f;
    this->X = X;
    this->n = n;
}

Eigen::MatrixXd RBF::predict(const double * Y,  double* dm, int nSamples) { 
    // Compute the pdist matrix
    using milli = std::chrono::milliseconds;
    auto start = std::chrono::high_resolution_clock::now();
    double * K_yx_array = cdist_euclidean(this->X, Y,  dm, this->n, nSamples, 3);
    auto pDistTime = std::chrono::high_resolution_clock::now();
    Eigen::Map<Eigen::MatrixXd> K_yx = Eigen::Map<Eigen::MatrixXd>(K_yx_array, nSamples, this->n);
    std::cout << "pDist time: " <<std::chrono::duration_cast<milli>(pDistTime - start).count() << std::endl;

    Eigen::MatrixXd  res = K_yx * this->Kx.partialPivLu().solve(this->f);
    return res ;
}

void countInterpolation(const int nNodes, double * points, double * dA, double * dP, double * dT,  
                        const int nSamples , double * sampleCoordinates, double * signSamples,
                        int * count) {

    using milli = std::chrono::milliseconds;
    auto start = std::chrono::high_resolution_clock::now();
    int i;
    // Copy nodes and poitns to eigen
    ObservationMatrix3  f(nNodes, 3);
    // Old style copy, if it is too slow, change
    for (i =0; i < nNodes; ++i) {

        f(i, 0) = dA[i];
        f(i, 1) = dP[i];
        f(i, 2) = dT[i];

    }
    double * Kx_array = (double *) malloc(nNodes * nNodes * sizeof(double));
    double * dm = (double *) malloc(nNodes * nSamples * sizeof(double));
    RBF rbf(points, Kx_array, nNodes, f);

    Eigen::MatrixXd fy = rbf.predict(sampleCoordinates, dm, nSamples);
    auto interpolate = std::chrono::high_resolution_clock::now();

    for (i =0; i < 3; ++i) 
        count[i] = 0;
    for (i = 0; i < nSamples; ++i) {
        int closest;
        if (fy(i, 0) < fy(i, 1) and fy(i, 0) < fy(i, 2)) {
            closest = 0;
        }
        else if (fy(i, 1) < fy(i, 2)){
            closest = 1;
        }
        else{ 
            closest = 2;
        }
        count[closest] += signSamples[i];
    }
    auto countTime = std::chrono::high_resolution_clock::now();
    std::cout << "Total wo memory " <<  std::chrono::duration_cast<milli>(countTime - start).count()  << std::endl;
    free(dm);
    free(Kx_array);

}

double* readDFromFile(std::string s, int n){
    std::fstream fs;
    double * res = (double *) malloc(n * sizeof(double));
    fs.open (s, std::fstream::in);
    for(int i = 0; i < n; ++i)
        fs >> res[i];
    return res;
}

int main() {
    using milli = std::chrono::milliseconds;

    int nNodes = 938;
    int nSamples = 50000;

    double *dA = readDFromFile("Data/dA.txt", nNodes);
    double *dP = readDFromFile("Data/dP.txt", nNodes);
    double *dT = readDFromFile("Data/dT.txt", nNodes);

    double *nodes = readDFromFile("Data/nodes.txt", 3 * nNodes);
    double *samples = readDFromFile("Data/samples.txt",3 * nSamples);
    double * signs = readDFromFile("Data/samplesSign.txt", nSamples);
    int count[3] = {0, 0, 0};
    auto start = std::chrono::high_resolution_clock::now();

    countInterpolation( nNodes,  nodes, dA, dP, dT,  
                        nSamples, samples, signs, count);
    std::cout << count[0] << " " << count[1] << " " <<  count[2] << std::endl;
    auto end = std::chrono::high_resolution_clock::now();

    std::cout << "Total wo reading " <<  std::chrono::duration_cast<milli>(end - start).count()  << std::endl;

}