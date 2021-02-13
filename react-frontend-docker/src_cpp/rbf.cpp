#include <Eigen/Dense>
#include <math.h>  


#include <iostream>
#include <fstream>
using namespace std;

double dist(const Eigen::ArrayXi& x, const Eigen::ArrayXd& y, int d) {
    double acum = 0;
    for (int i = 0; i < d; ++i){
        double tmp = (x(i) - y(i));
        acum += tmp * tmp;
    }
    return sqrt(acum);
}


Eigen::MatrixXD pDist1(const Eigen::MatrixXD& X){
    int n = X.rows();
    Eigen::MatrixXD res(n, n);
    for (int i = 0; i <n){
        res[i][i] = 0.;
        for (int j = i; + 1 j < n) {
            res(i,j) = dist(X(i), X(j) );
            res(j, i) = res(i, j);
        }
    }
    return res;
}


Eigen::MatrixXD pDist2(const Eigen::MatrixXD& X, const Eigen::MatrixXD& Y){
    Eigen::MatrixXD res(X.rows(), Y.rows());
    for (int i = 0; i < X.rows())
        for (int j = 0; j < Y.rows()) {
            res(i,j) = dist(X(i), Y(j) );
        }
}

class RBF{
    Eigen::MatrixXd Kx;
    Eigen::MatrixXd f;
    Eigen::MatrixXd X;

    public:
        RBF(Eigen::MatrixXD& X, Eigen::MatrixXD& f);
        predict(const Eigen::MatrixXD&);

};


RBF::RBF(Eigen::MatrixXD& X,  Eigen::MatrixXD& f){
    this->Kx = pDist1(X);
    this->f = f;
    this->X = X;
}

Eigen::MatrixXD RBF::predict(const Eigen::MatrixXD& Y) { 
    // Compute the pdist matrix
    Eigen::MatrixXd K_xy = pDist2(this->X, Y);
    return K_xy * this->Kx.solve(this->f) ;
}




void countInterpolation(const int nNodes, double * points, double * dA, double * dP, double * dT,  
                        const int nSamples , double * sampleCoordinates, int * signSamples,
                        int * count) {
    int i;
    // Copy nodes and poitns to eigen
    Eigen::MatrixXd  X( nNodes, 3), Y(nSamples, 3), f(nNodes, 3);
    // Old style copy, if it is too slow, change
    for (i =0; i < nNodes; ++i) {
        X(i, 0) = points[3*i];
        X(i, 1) = points[3*i + 1];
        X(i, 2) = points[3*i + 2];

        f(i, 0) = dA[i];
        f(i, 1) = dP[i];
        f(i, 2) = dT[i];

    }

    for (i = 0; i < nSamples; ++i) {
        Y(i, 0) = sampleCoordinates[3*i];
        Y(i, 1) = sampleCoordinates[3*i + 1];
        Y(i, 2) = sampleCoordinates[3*i + 2];

    }
    RBF rbf(X, f);
    Eigen::MatrixXd fy = rbf.predicy(Y);
    for (i =0; i < 3; ++i) 
        count[i] = 0;
    for (i = 0; i < nSamples; ++i) {
        int closest;
        if (fy(i, 0) < fy(i, 1) and fy(i, 0) < fy(i, 2)) 
            closest = 0;
        else if (fy(i, 1 < fy(i, 2)){
            closest = 1;
        }
        else{ 
            closest = 2;
        }
        count[closest] += signSamples[i];
    }
}


int main() {


}