
function parseGESTFile(text){
    let regexFloat =  "[-]?[0-9]+\.[0-9]+";
    let regexInt = "[0-9]+";
    
    let timingRegex = new RegExp( `FR=\\s+(${regexInt}) Left Marker Time=(${regexFloat}) Right Marker Time=(${regexFloat}) ES Time=(${regexFloat})`, 'g');
    let resTiming = timingRegex.exec(text)
    console.log(resTiming, resTiming[1])

    let sizeRegex = new RegExp(`Num Frames:  Knots:\\s+(${regexInt})\\s+(${regexInt})`, 'g');
    sizeRegex.lastIndex = timingRegex.lastIndex;
    let resSize = sizeRegex.exec(text)
    let nFrames =parseInt(resSize[1]);
    let nKnots = parseInt(resSize[2]);
    console.log(resSize, nFrames, nKnots, resSize[1])


    // Parse the
    let traces = [];
    let readNewFloat = new RegExp(`(${regexFloat}),`, 'g');
    //readNewFloat.lastIndex = sizeRegex.lastIndex;
    for (let i = 0; i < nFrames; ++i){
        let  frame =  new Float32Array(nKnots * 2);
        console.log('meow')
        for (let j = 0; j < 2 * nKnots; ++j) { 
            let res = readNewFloat.exec(text);
            console.log(res[1], readNewFloat.lastIndex)
            frame[j] = parseFloat(res[1])
        }
        traces.push(frame)
        break;
    }
    return traces
}


function area2D(polyline) {
    //pivot point is (0,0)
    let area = 0;
    for (let i = 0; i < 2 * (nPoints - 1); i += 2 ) { 
        area += polyline[2*i] * polyline[2* (i + 1) + 1] - polyline[2*i + 1] *   polyline[2*(i + 1)];
    }
    //add last triangle
    area += polyline[2*(nPoints - 1)] * polyline[2* (0) + 1] - polyline[2*(nPoints - 1) + 1] *   polyline[2 * 0+ 1];
    return area
}  

class PartitionSpeckleTrackingContour{
    constructor(polylineED) {

    }

    computePartition(polyline) {


        return [apicalPolyline, basalPolyline, areaApical, areaBasal];
    }
}

function distanceTransform(polyline){
    d = new FLoatArray32(Math.floor(polyline.length/2));
    for (let i = 0 ; i < d.length; i++) {
        let dx = polyline[2*i] - polyline[2*(i + 1)];
        let dy = polyline[2*i + 1] - polyline[2*(i + 1 + 1)];
        d[i] = Math.sqrt(dx*dx + dy * dy);
    }
    return d
}

function cumsum(v){
    c = new FLoatArray32(v.length);
    c[0] =0;
    for (let i = 1; i < v.length; ++i){
        c[i] = c[i -1] + v[i];
    }
    return v;
}

text = "FName=NMC\
LName=\
ID=ADUHEART002\
Exam.Date=13_05_2015\
View=2CH\
2DS Date=2017_03_28\
Knot positions (X:Y) in mm (relative to probe position)\
FR= 88 Left Marker Time=0.136000 Right Marker Time=1.019000 ES Time=0.532000\
Num Frames:  Knots:\
     108       63\
     3.08,  111.17, 2.08,  108.39, 1.07,  105.60, 0.06,  102.79,-0.95,  99.94,-1.95,  97.05,-2.92,  94.12,-3.84,  91.15,-4.68,  88.14,-5.43,  85.12,-6.09,  82.10,-6.71,  79.09,-7.34,  76.10,-7.97,  73.11,-8.60,  70.12,-9.18,  67.12,-9.69,  64.08,-10.08,  61.04,-10.34,  57.97,-10.47,  54.83,-10.48,  51.58,-10.33,  48.24,-10.01,  44.87,-9.52,  41.52,-8.84,  38.25,-7.95,  35.12,-6.84,  32.20,-5.51,  29.54,-3.97,  27.20,-2.20,  25.26,-0.22,  23.76, 1.94,  22.76, 4.26,  22.31, 6.68,  22.43, 9.11,  23.10, 11.51,  24.28, 13.80,  25.89, 15.97,  27.88, 18.02,  30.20, 19.94,  32.78, 21.76,  35.58, 23.46,  38.55, 25.05,  41.64, 26.55,  44.82, 27.97,  48.05, 29.30,  51.29, 30.57,  54.51, 31.79,  57.69, 32.96,  60.82, 34.08,  63.90, 35.15,  66.95, 36.15,  69.97, 37.05,  72.98, 37.82,  76.00, 38.46,  79.01, 38.95,  82.02, 39.30,  85.03, 39.51,  88.03, 39.61,  91.00, 39.62,  93.97, 39.56,  96.91, 39.45,  99.85, 39.31,  102.78,\
"
console.log(parseGESTFile(text))