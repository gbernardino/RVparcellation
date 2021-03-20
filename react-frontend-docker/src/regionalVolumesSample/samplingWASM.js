function arrayInt32ToPtr(module, array, l) {
    let nByte = 4;
    var ptr = module._malloc(array.length * nByte)
    module.HEAP32.set(array, ptr / nByte)
    l.push(ptr);
    return ptr
  }
  
function arrayFloat32ToPtr(module, array, l) {
    let nByte = 4
    var ptr = module._malloc(array.length * nByte)
    module.HEAPF32.set(array, ptr / nByte)
    l.push(ptr);

    return ptr
}

function arrayToFloat32(array){
    if (array instanceof Float32Array){
        return array;
    }
    else{
        var typedArray = Float32Array.from(array.flat());
        return typedArray
    }
}

export function computeRegionalVolumeSamplingWASM(module, mesh) {

    let nSamples = 10000;
    var t1 = Date.now()

    // Convert everything to C
    // If slow, could be optimised since 1) we can reuse the allocated space and 2) there is no need of so many onversion
    var ptrs = [];

    var triangles =  Int32Array.from(mesh.E.flat());
    var trianglesC = arrayInt32ToPtr(module, triangles, ptrs);

    var points = arrayToFloat32(mesh.Varray);
    var pointsC = arrayFloat32ToPtr(module, points, ptrs);

    var dA = arrayToFloat32(mesh.dA);
    var dAC = arrayFloat32ToPtr(module, dA, ptrs);

    var dP = arrayToFloat32(mesh.dP);
    var dPC = arrayFloat32ToPtr(module, dP, ptrs);

    var dT = arrayToFloat32(mesh.dT)
    var dTC = arrayFloat32ToPtr(module, dT, ptrs);

    var res = new Float32Array(4);
    var resC = arrayFloat32ToPtr(module, res, ptrs); // Reserve the space for output
    var t2 = Date.now()
    console.log('Time on copying data', t2 -t1)
    module._doParcellationSampling(pointsC, dAC,dPC, dTC, mesh.V.length, 
        trianglesC, mesh.E.length,  nSamples, resC);

    var vol = module.HEAPF32[resC/4];
    var cA = module.HEAPF32[resC/4 + 1];
    var cP = module.HEAPF32[resC/4 + 2];
    var cT = module.HEAPF32[resC/4 + 3];
    console.log(vol, cA, cP, cT)

    for (let i = 0; i < ptrs.length; i += 1) { 
        module._free(ptrs[i]);
    }
    //module.doLeakCheck();

    return[ vol * cP, vol * cT, vol * cA];
}

export function geodesicsWASM(module, polygonSoup) {
    var ptrs = [];

    let E = polygonSoup[1];
    let V = polygonSoup[0];
    let Varray = [];
    for (let i = 0; i < V.length; i++) {
        Varray.push([V[i].x, V[i].y, V[i].z])
    }
    var Etyped = Int32Array.from(E.flat());
    var EC = arrayInt32ToPtr(module, Etyped, ptrs);

    var Vtyped = arrayToFloat32(Varray);
    var VC = arrayFloat32ToPtr(module, Vtyped, ptrs);

    var dA = new Float32Array(V.length);
    var dAC = arrayFloat32ToPtr(module, dA, ptrs); // Reserve the space for output

    var dP = new Float32Array(V.length);
    var dPC = arrayFloat32ToPtr(module, dP, ptrs); // Reserve the space for output

    var dT = new Float32Array(V.length);
    var dTC = arrayFloat32ToPtr(module, dT, ptrs); // Reserve the space for output

    module._geodesicComputation(VC, EC, V.length, E.length, dAC, dPC, dTC)
    
    for (let i = 0; i < dA.length; i++){
        dA[i] = module.HEAPF32[dAC/4 + i];
        dP[i] = module.HEAPF32[dPC/4 + i];
        dT[i] = module.HEAPF32[dTC/4 + i];

    }

    for (let i = 0; i < ptrs.length; i += 1) { 
        module._free(ptrs[i]);
    }
    //Returns
    let res = {}
    res.E = E;
    res.V = V;
    res.Varray = Varray;
    res.dA = dA;
    res.dP = dP;
    res.dT = dT;
    return res;

}