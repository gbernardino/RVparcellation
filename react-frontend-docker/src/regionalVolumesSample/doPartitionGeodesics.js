import { Vector3 } from 'math-ds';
import MeshSampler from './sample'
import { PointOctree } from "sparse-octree";
let debug = false;
let geodesics = require('mesh-geodesic');
let RBF = require("rbf");

function minimum(v1, v2, n){
    let v =[];
    for(let i = 0; i < n; i++){
        v.push(Math.min(v1[i], v2[i]))
    }
    return v;
}
function mapToArray(v, n){
    let arr = [];
    for (let i = 0; i < n; i++){
        arr.push(v[i])
    }
    return arr
}

export function doPartitionGeodesics(polygonSoup){
    let E = polygonSoup[1];
    let V = polygonSoup[0];
    let Varray = [];
    for (let i = 0; i < V.length; i++) {
        Varray.push([V[i].x, V[i].y, V[i].z])
    }
    
    let apexId = 906;
    let pointsTricuspid = [388, 389, 392, 393, 144, 540, 145, 538, 539, 422, 423, 38, 541, 49, 55, 328, 329, 332, 333, 87, 94, 100, 101, 103, 104, 105, 122, 123, 126, 127];
    let pointsPulmonary = [410, 411, 409, 408, 53, 64, 65, 66, 67, 68, 69, 83, 476, 477, 92, 478, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 479];
    let dApex = geodesics(E, Varray,  apexId);
    let dTricuspid = geodesics(E, Varray,  pointsTricuspid[0]);
    for (let i = 1; i < pointsTricuspid.length; i++) {
        dTricuspid = minimum(dTricuspid, geodesics(E, Varray,  pointsTricuspid[i]), V.length)
    }

    let dPulmonary = geodesics(E, Varray,  pointsPulmonary[0]);
    for (let i = 1; i < pointsPulmonary.length; i++) {
        dPulmonary = minimum(dPulmonary, geodesics(E, Varray,  pointsPulmonary[i]), V.length)
    }
    let res =  {};
    res.E = E;
    res.V = V;
    res.Varray = Varray;
    res.dA = mapToArray(dApex, V.length);
    res.dP = mapToArray(dPulmonary, V.length);
    res.dT = mapToArray(dTricuspid, V.length);
    return res;
}
export function copyPartition(polygonSoup, partition){
    let newPartition = {};
    newPartition.E = polygonSoup[1];
    newPartition.V = polygonSoup[0];
    let Varray = [];
    for (let i = 0; i < newPartition.V.length; i++) {
        Varray.push([newPartition.V[i].x, newPartition.V[i].y, newPartition.V[i].z])
    }
    newPartition.Varray = Varray;
    newPartition.dA = partition.dA;
    newPartition.dP = partition.dP;
    newPartition.dT = partition.dT;
    return newPartition;
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

let interpolationMethod = 'rbf';
let transpose = m => m[0].map((x,i) => m.map(x => x[i])) // https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript
export function computeRegionalVolumeSampling(mesh){
    var t0 = Date.now();

    let sampler = new MeshSampler(mesh.V, mesh.E)
    var nsamples;
    if (mesh.nsamples === undefined) {
        nsamples = 1000
    }
    else {
        nsamples = mesh.nsamples
    }
    let cA = 0;
    let cP = 0;
    let cT = 0;
    let m = boundingBox(mesh.V);
    var octtree = new PointOctree(m[0], m[1]);
    if (interpolationMethod === 'nearest') {
        for (let i = 0; i < mesh.V.length; i++) {
            octtree.insert(mesh.V[i], i);
        }
    }
    var t1 = Date.now()
    console.log(t1 - t0)
    //var rbfA, rbfT, rbfP;
    var rbfAllSegments;
    if (interpolationMethod === 'rbf') {
        rbfAllSegments = RBF(mesh.Varray, transpose([mesh.dA, mesh.dP, mesh.dT]), 'linear');
    }
    var t2 = Date.now()
    console.log('Time construct RBF', t2 - t1)

    for (let i = 0; i < nsamples; i ++)
    {
        let p = sampler.getSample();

        // Get the counts  --- we can actually precompute the partition...
        var daa, dpp, dtt;
        if (interpolationMethod === 'nearest') {
            let res = octtree.findNearestPoint(p.point);
            let iPoint = res.data;
            daa = mesh.dA[iPoint];
            dpp = mesh.dP[iPoint];
            dtt = mesh.dT[iPoint];
        }
        else {

            let d = rbfAllSegments([p.point.x, p.point.y, p.point.z])
            daa = d[0];
            dpp = d[1];
            dtt = d[2];
    
            if (debug && i % 100 === 0){
                console.log(daa, dpp, dtt)
            }
        }

        if (daa < dtt && daa < dpp){
            cA += p.sign
        }
        else if (dtt < dpp){ 
            cT += p.sign;
        } 
        else {
            cP += p.sign;
        }
    }
    var t3 = Date.now()
    console.log('Time sampling', t3 - t2)
    console.log('Time total', t3 - t0)

    let totalVol = sampler.totalVol;
    let pA = cA/(cA + cP + cT) * totalVol;
    let pP = cP/(cA + cP + cT) * totalVol;
    let pT = cT/(cA + cP + cT) * totalVol;
    return[pP, pT, pA];
}

