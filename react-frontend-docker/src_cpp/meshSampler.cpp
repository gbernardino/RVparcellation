
float volTetra(float * p1, float * p2, float * p3, float * p4){
    float a1, a2,a3,b1,b2,b3,c1,c2,c3;
    a1 = p1[0] - p4[0]; 
    a2 = p1[1] - p4[1];
    a3 = p1[2] - p4[2];

    b1 = p2[0] - p4[0]; 
    b2 = p2[1] - p4[1];
    b3 = p2[2] - p4[2];

    c1 = p3[0] - p4[0]; 
    c2 = p3[1] - p4[1];
    c3 = p3[2] - p4[2];

    return  ((a1*b2*c3)+(a3*b3*c1)+(a3*b1*c2)) + (-c1*-b2*-a3)+(-c2*-b3*-a1)+(-c3*-b1*-a2);

}

class MeshSampler{
        float * coordinates;
        int * triangles;
        float * tetraVolumesAcum;
        
        int nPoints;
        int nCells;

        float volume;
        float absVolume;

    public:
        MeshSampler(int * coordinates,float  * triangles);
        void sample(int nSamples, float* outPoints);
        void sampleTetrahedralCoordinates(int nSamples, float* outCoords);
};

