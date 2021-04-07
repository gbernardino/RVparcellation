
export function parseGESTFile(text){
    let regexFloat =  "[-]?[0-9]+.?[0-9]*";
    let regexInt = "[0-9]+";
    
    let timingRegex = new RegExp( `FR=\\s+(${regexInt}) Left Marker Time=(${regexFloat}) Right Marker Time=(${regexFloat}) ES Time=(${regexFloat})`, 'g');
    let resTiming = timingRegex.exec(text)
    let FR = parseInt(resTiming[1])
    //let LMTi = Math.round(Number(resTiming[2]) * FR)
    //let RMTi = Math.round(Number(resTiming[3]) * FR)
    //let ES = Math.round(Number(resTiming[4])*FR) - LMTi

    let sizeRegex = new RegExp(`Num Frames:  Knots:.*\\s+(${regexInt})\\s+(${regexInt})`, 'g');
    sizeRegex.lastIndex = timingRegex.lastIndex;
    let resSize = sizeRegex.exec(text)
    console.log(resSize)

    let nFrames =parseInt(resSize[1]);
    let nKnots = parseInt(resSize[2]);
    // Parse the
    let traces = [];
    let readNewFloat = new RegExp(`(${regexFloat})[,\\s]`, 'g');
    readNewFloat.lastIndex = sizeRegex.lastIndex;
    let areas = []
    console.log(nFrames, nKnots)
    //readNewFloat.lastIndex = sizeRegex.lastIndex;
    for (let i = 0; i < nFrames; ++i){
        let  frame =  new Float32Array(nKnots * 2);
        for (let j = 0; j < 2 * nKnots; ++j) { 
            let res = readNewFloat.exec(text);
            frame[j] = parseFloat(res[1])
            //console.log(frame[j])
        }
        //console.log(frame[2 * nKnots - 1], i)
        traces.push(frame);
        areas.push(area2DPolyline(frame));
    }


    //From https://gist.github.com/janosh/099bd8061f15e3fbfcc19be0e6b670b9
    const argFact = (compareFn) => (array) => array.map((el, idx) => [el, idx]).reduce(compareFn)[1]

    const argMax = argFact((min, el) => (el[0] > min[0] ? el : min))
    const argMin = argFact((max, el) => (el[0] < max[0] ? el : max))

    let ED = argMax(areas);
    let ES = argMin(areas);
    console.log(ED, ES)
    return {traces : traces,  FR : FR, ES : ES, ED : ED}
}


function area2DPolyline(polyline) {
    //pivot point is (0,0)
    let area = 0;
    var nPoints = Math.round(polyline.length/2);
    for (let i = 0; i < 2 * (nPoints - 1); i += 2 ) { 
        area += polyline[i] * polyline[i + 2 + 1] - polyline[i + 1] *   polyline[i + 2];
    }
    //add last triangle
    area += polyline[2*(nPoints - 1)] * polyline[2* (0) + 1] - polyline[2*(nPoints - 1) + 1] *   polyline[2 * 0];
    return area
}  

export class PartitionSpeckleTrackingContour{
    constructor(polylineED, nPoints) {
        //apexId
        let apexId = Math.floor(nPoints/2);
        let distances = cumsum(distanceTransform(polylineED));

        let d1 = distances[apexId] / 2;
        let d2 = (distances[distances.length - 1] + distances[apexId]) / 2;
        this.intersection1 = findLinearInterpolation(distances, d1);
        this.intersection2 = findLinearInterpolation(distances, d2);

        this.nPoints = nPoints
    }

    computePartition(polyline) {
        let nPointsApex = 2 + (this.intersection2.i - this.intersection1.i)
        let nPointsBase = 2 + (this.intersection1.i  + 1) +  (this.nPoints - this.intersection2.i  -1 )
        // Create the apical polyline
        var apicalPolyline = new Float32Array(2 * nPointsApex)
        // Add first point
        let t1 = this.intersection1.t
        let i1 = this.intersection1.i
        apicalPolyline[0] = t1 * polyline[2* i1] + (1 - t1 ) *  polyline[2* (i1 + 1)];
        apicalPolyline[1] = t1 * polyline[2* i1 + 1] + (1 - t1 ) *  polyline[2* (i1 + 1) + 1];
        //add middle 
        var iApex = 1;
        for (let i = this.intersection1.i + 1; i <= this.intersection2.i; i++) { 
            apicalPolyline[2*iApex] = polyline[2*i]
            apicalPolyline[2*iApex + 1] = polyline[2*i + 1]
            iApex = iApex + 1;
        }
        //add last
        let t2 = this.intersection2.t
        let i2 = this.intersection2.i
        apicalPolyline[2*iApex] = t2 * polyline[2* i2] + (1 - t2 ) *  polyline[2* (i2 + 1)];
        apicalPolyline[2*iApex + 1] = t2 * polyline[2* i2 + 1] + (1 - t2) *  polyline[2* (i2 + 1) + 1];


        //Create the basal polyline
        var basalPolyline = new Float32Array(2 * nPointsBase);
        var iBasal = 0;
        //Copy first part -> 0 to i
        for (let i = 0; i <= this.intersection1.i; i++) { 
            basalPolyline[2*iBasal] = polyline[2*i]
            basalPolyline[2*iBasal + 1] = polyline[2*i + 1]
            iBasal += 1;
        }

        //Copy 2 points
        basalPolyline[2*iBasal + 0] = apicalPolyline[0];
        basalPolyline[2*iBasal + 1] = apicalPolyline[0 + 1];
        iBasal += 1;
        basalPolyline[2*iBasal + 0] = apicalPolyline[2*nPointsApex - 2];
        basalPolyline[2*iBasal + 1] = apicalPolyline[2*nPointsApex - 1];
        iBasal += 1;
        //Copy last segment
        for (let i = this.intersection2.i + 1; i < this.nPoints; i++) { 
            basalPolyline[2*iBasal] = polyline[2*i]
            basalPolyline[2*iBasal + 1] = polyline[2*i + 1]
            iBasal += 1;
        }
        return {apicalPolyline: apicalPolyline, basalPolyline: basalPolyline,
                 areaApical : area2DPolyline(apicalPolyline), areaBasal : area2DPolyline(basalPolyline)}
    }
}

function findLinearInterpolation(v, k){
    var t;
    var iFinal
    for(let i = 0; i < v.length; i++) {
        if (v[i] <= k && v[i + 1] > k) {
            // t * v[i] + (1 - t) * v[i + 1] = k
            //t (v[i] - v[i +1]) = k - v[i + 1]
            t = (k - v[i + 1])/(v[i] - v[i + 1])
            iFinal = i; 
            break
        }
    }
    return {i: iFinal, t:t}
}

function distanceTransform(polyline){
    let d = new Float32Array(Math.floor(polyline.length/2) - 1);
    for (let i = 0 ; i < d.length; i++) {
        let dx = polyline[2*i] - polyline[2*(i + 1)];
        let dy = polyline[2*i + 1] - polyline[2*(i + 1) + 1];
        d[i] = Math.sqrt(dx*dx + dy * dy);
    }
    return d
}

function cumsum(v){
    let c = new Float32Array(v.length);
    c[0] =0;
    for (let i = 1; i < v.length; ++i){
        c[i] = c[i -1] + v[i];
    }
    return c;
}




// Main
/*
fs = require('fs')
fs.readFile('/Users/gbernardino/Data/aduheartSpeckleTracking/ADUHEART051/4CHAMBERS/2DS120_ADUHEART051__05_06_2015_4CH_FULL_TRACE_SEGADUHEART051 4CH.CSV', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  let parsedPolylines = parseGESTFile(data);
  let partition = new PartitionSpeckleTrackingContour(parsedPolylines[0], Math.round(parsedPolylines[0].length/2));

  console.log(
      console.log(partition.computePartition(parsedPolylines[0]))
  );
});
*/