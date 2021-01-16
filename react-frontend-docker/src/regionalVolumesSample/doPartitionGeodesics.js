import { Vector3 } from 'math-ds';
import MeshSampler from './sample'
import { PointOctree } from "sparse-octree";

let geodesics = require('mesh-geodesic');

function minimum(v1, v2){
    let v =[];
    for(let i = 0; i < v1.length; i++){
        v.push(Math.min(v1[i], v2[i]))
    }
    return v;
}
export function doPartitionGeodesics(polygonSoup){
    let E = polygonSoup[1];
    let V = polygonSoup[0];
    let Varray = [];
    for (let i = 0; i < V.length; i++) {
        Varray.push([V[i].x, V[i].y, V[i].z])
    }

    let d = geodesics(E, Varray,  0);
    console.log(d);

    let apexId = 906;
    let pointsTricuspid = [102];
    let pointsPulmonary = [63];
    let dApex = geodesics(E, Varray,  apexId);
    let dTricuspid = geodesics(E, Varray,  pointsTricuspid[0]);
    for (let i = 1; i < pointsTricuspid.length; i++) {
        dTricuspid = minimum(dTricuspid, geodesics(E, Varray,  pointsTricuspid[i]))
    }

    let dPulmonary = geodesics(E, Varray,  pointsPulmonary[0]);
    for (let i = 1; i < pointsPulmonary.length; i++) {
        dPulmonary = minimum(dPulmonary, geodesics(E, Varray,  pointsPulmonary[i]))

    }
    let res = new Object();
    res.E = E;
    res.V = V;
    res.dA = dApex;
    res.dP = dPulmonary;
    res.dT = dTricuspid;
    return res;
}

function boundingBox(points) {
    var min = new Vector3(1000,10000,1000);
    var max = new Vector3(-1000,-10000,-1000);
    for (let i = 0; i < points.length; i++) {
        if (min.x > points[i].x){
            min.x = points[i].x
        }
        if (max.x < points[i].x){
            max.x = points[i].x
        }

        if (min.y > points[i].y){
            min.y = points[i].y
        }
        if (max.y < points[i].y){
            max.y = points[i].y
        }

        if (min.z > points[i].z){
            min.z = points[i].z
        }
        if (max.z < points[i].z){
            max.z = points[i].z
        }
    }
    return [min, max]
}


export function computeRegionalVolumeSampling(mesh){
    let sampler = new MeshSampler(mesh.V, mesh.E)
    var nsamples;
    if (mesh.nsamples == undefined) {
        nsamples = 10000
    }
    else {
        nsamples = mesh.nsamples
    }
    let cA = 0;
    let cP = 0;
    let cT = 0;
    let m = boundingBox(mesh.V);
    var octtree = new PointOctree(m[0], m[1]);
    for (let i = 0; i < mesh.V.length; i++) {
        octtree.insert(mesh.V[i], i);
    }
    for (let i = 0; i < nsamples; i ++)
    {
        let p = sampler.getSample();
        let res = octtree.findNearestPoint(p.point);
        let iPoint = res.data;

        // Get the counts  --- we can actually precompute the partition...
        if (mesh.dA[iPoint] < mesh.dT[iPoint] && mesh.dA[iPoint] < mesh.dP[iPoint]){
            cA += p.sign
        }
        else if (mesh.dT[iPoint] < mesh.dP[iPoint]){ 
            cT += p.sign;
        } 
        else {
            cP += p.sign;
        }
    }
    let pA = cA/(cA + cP + cT);
    let pP = cP/(cA + cP + cT);
    let pT = cT/(cA + cP + cT);
    console.log(pA, pP, pT);
    return (pA, pP, pT);
}

