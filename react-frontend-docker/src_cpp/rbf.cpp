
#include <cmath>  
#include "rbf.hpp"

real euclidean_distance( const real *u, const real *v,
                    const int n)
{
    real s = 0.0;
    int i;

    for (i = 0; i < n; ++i) {
        const real d = u[i] - v[i];
        s += (d * d);
    }
    return std::sqrt(s);
}


real *  cdist_euclidean(const real *XA, const real *XB,  real *dm,
                  const int num_rowsA, const int num_rowsB,
                 const int num_cols)
{
    int i, j;
    real* dmiter = dm;
    for (i = 0; i < num_rowsA; ++i) {
        const real *u = XA + (num_cols * i);
        for (j = 0; j < num_rowsB; ++j, ++dmiter) {
            const real *v = XB + (num_cols * j);
            *dmiter = euclidean_distance( u, v, num_cols);
        }
    }
    return dm;
}



real Sqrt(real x) // the functor we want to apply
{
    return std::sqrt(x);
}

MatrixReal pDist2(const ObservationMatrix3& X, const ObservationMatrix3& Y){
    auto D = ( (X * Y.transpose() * -2
        ).colwise() + X.transpose().colwise().squaredNorm().transpose() 
        ).rowwise() + Y.transpose().colwise().squaredNorm();        
    return D.unaryExpr(&Sqrt);
}

RBF::RBF(real * X,   real* Kx_array,  int n,  ObservationMatrix3& f ){
    this->Kx_array = Kx_array;
    cdist_euclidean(X,X ,Kx_array,  n, n, 3);
    this->Kx = Eigen::Map<MatrixReal>(Kx_array, n, n);
    this->f = f;
    this->X = X;
    this->n = n;
}

MatrixReal RBF::predict(const real * Y,  real* dm, int nSamples) { 
    // Compute the pdist matrix
    real * K_yx_array = cdist_euclidean(this->X, Y,  dm, this->n, nSamples, 3);
    Eigen::Map<MatrixReal> K_yx = Eigen::Map<MatrixReal>(K_yx_array, nSamples, this->n);

    MatrixReal  res = K_yx * this->Kx.partialPivLu().solve(this->f);
    return res ;
}

void countInterpolation(const int nNodes, real * points, real * dA, real * dP, real * dT,  
                        const int nSamples , real * sampleCoordinates, real * signSamples,
                        int * count) {

    int i;
    // Copy nodes and poitns to eigen
    ObservationMatrix3  f(nNodes, 3);
    // Old style copy, if it is too slow, change
    for (i =0; i < nNodes; ++i) {

        f(i, 0) = dA[i];
        f(i, 1) = dP[i];
        f(i, 2) = dT[i];

    }
    real * Kx_array = (real *) malloc(nNodes * nNodes * sizeof(real));
    real * dm = (real *) malloc(nNodes * nSamples * sizeof(real));
    RBF rbf(points, Kx_array, nNodes, f);

    MatrixReal fy = rbf.predict(sampleCoordinates, dm, nSamples);

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
    free(dm);
    free(Kx_array);

}