#pragma once

#include <Eigen/Dense>
#include <Eigen/Core>


#if USE_DOUBLE  
    typedef double real;
    typedef Eigen::MatrixXd MatrixReal;
#else
    typedef float real;
    typedef Eigen::MatrixXf MatrixReal;
#endif
typedef Eigen::Matrix<real, Eigen::Dynamic, 3, Eigen::RowMajor> ObservationMatrix3;
