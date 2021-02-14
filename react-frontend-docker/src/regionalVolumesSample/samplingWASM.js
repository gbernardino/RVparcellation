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

export function computeRegionalVolumeSamplingWASM(module, mesh) {

    let nSamples = 10000;
    var t1 = Date.now()

    // Convert everything to C
    // If slow, could be optimised since 1) we can reuse the allocated space and 2) there is no need of so many onversion
    var ptrs = Array();

    var triangles =  new Int32Array;
    triangles = Int32Array.from(mesh.E.flat());
    var trianglesC = arrayInt32ToPtr(module, triangles, ptrs);

    var points = new Float32Array;
    points = Float32Array.from(mesh.Varray.flat());
    var pointsC = arrayFloat32ToPtr(module, points, ptrs);

    var dA = new Float32Array
    dA = Float32Array.from(mesh.dA.flat());
    var dAC = arrayFloat32ToPtr(module, dA, ptrs);

    var dP = new Float32Array;
    dP = Float32Array.from(mesh.dP.flat());
    var dPC = arrayFloat32ToPtr(module, dP, ptrs);

    var dT = new Float32Array;
    dT = Float32Array.from(mesh.dT.flat());
    var dTC = arrayFloat32ToPtr(module, dT, ptrs);

    var res = new Float32Array(4);
    var resC = arrayFloat32ToPtr(module, res, ptrs); // Reserve the space for output
    var t2 = Date.now()
    console.log('Time on copying data', t2 -t1)
    module._doParcellationSamplint(pointsC, dAC,dPC, dTC, mesh.V.length, 
        trianglesC, mesh.E.length,  nSamples, resC);

    for (let i = 0; i < ptrs.length; i += 1) { 
        module._free(ptrs[i]);
    }

    var vol = module.HEAPF32[resC/4];
    var cA = module.HEAPF32[resC/4 + 1];
    var cP = module.HEAPF32[resC/4 + 2];
    var cT = module.HEAPF32[resC/4 + 3];
    console.log(vol, cA, cP, cT)
    return[ vol * cP, vol * cT, vol * cA];
}