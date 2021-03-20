import {Vector3, Matrix3} from 'math-ds'


function parseUCD(text) {
    var Points = [];
    var Cells = [];

    var lines = text.split(/[\r\n]+/g); // tolerate both Windows and Unix linebreaks
    let firstLine = lines[0].split(/ +/)
    let nPoints = parseInt(firstLine[0]);
    let nCells = parseInt(firstLine[1])
    var nLine = 1;
    for (let i = 0; i < nPoints; i ++) {
        let line = lines[nLine].split(' ')
        Points.push(new Vector3(parseFloat(line[1]), parseFloat(line[2]), parseFloat(line[3])));
        nLine++;
    }
    for (let i = 0; i < nCells; i ++) {
        let line = lines[nLine].split(/ +/)
        if (line[2] !== 'tri') {
            console.log(lines[nLine], nLine, firstLine)
            throw('UCD has non-triangle face')
        }
        Cells.push([ parseInt(line[3]), parseInt(line[4]), parseInt(line[5])])

        nLine++
    }
    return [Points, Cells]
}

function parseVTK(text) {
    var Points = [];
    var Cells = [];

    let floatExpr = "[+-]?([0-9]*[.])?[0-9]+";
    let intExpr = "[0-9]+";

    // Parse points
    let sizeRegex = new RegExp(`POINTS (${intExpr}) float`, 'g');
    let resPoints = sizeRegex.exec(text)
    let nPoints =parseInt(resPoints[1]);

    let floatRegex = new RegExp(`${floatExpr}`, 'g');
    floatRegex.lastIndex = sizeRegex.lastIndex;
    for (let i = 0; i < nPoints; i ++) {
        let pointString1 = floatRegex.exec(text)
        let pointString2 = floatRegex.exec(text)
        let pointString3 = floatRegex.exec(text)

        Points.push(new Vector3(parseFloat(pointString1[0]), parseFloat(pointString2[0]), parseFloat(pointString3[0])));
    }

    // Parse cells
    let polygonsRegex = new RegExp(`POLYGONS\\s+(${intExpr})\\s+(${intExpr})`, 'g');
    polygonsRegex.lastIndex = floatRegex.lastIndex;
    let resFaces = polygonsRegex.exec(text);
    console.log(resFaces)

    let nCells =parseInt(resFaces[1]);

    let parseIntRegex = new RegExp(`(${intExpr})`, 'g');
    parseIntRegex.lastIndex = polygonsRegex.lastIndex;
    for (let i = 0; i < nCells; i ++) {
        let nPointsInCell = parseInt(parseIntRegex.exec(text)[0]);
        let cell = []
        for (let j = 0; j < nPointsInCell; ++j){

            cell.push(parseInt(
                 parseInt(parseIntRegex.exec(text)[0])
                  ));
        }
        Cells.push(cell)
    }

    return [Points, Cells]
}

export function volume(coordinates, triangles) {
  // COMPUTE mean
  let mean = new Vector3(0,0,0);
  for (let i = 0; i < coordinates.length; i++) {
      mean.addScaledVector(coordinates[i], 1 /coordinates.length)
  }

  let totalVol = 0;
  for (let i = 0; i < triangles.length; i++) {
      let m = new Matrix3();
      let t = triangles[i]
      m.set(
          coordinates[t[0]].x - mean.x, coordinates[t[0]].y - mean.y, coordinates[t[0]].z - mean.z, 
          coordinates[t[1]].x - mean.x, coordinates[t[1]].y - mean.y, coordinates[t[1]].z - mean.z, 
          coordinates[t[2]].x - mean.x, coordinates[t[2]].y - mean.y, coordinates[t[2]].z - mean.z)
      let vol = m.determinant()/6;
      totalVol += vol;
  }
  return totalVol;
}

export function readFile(blob) {
    function readFile(blob){
        return new Promise((resolve, reject) => {
          var fr = new FileReader();  
          fr.onload = () => {
            resolve(fr.result )
          };
          fr.readAsText(blob);
        });
      }
      if (blob.name.endsWith(".ucd")){
         return readFile(blob).then(parseUCD)
      }
      else if (blob.name.endsWith(".vtk")){
        return readFile(blob).then(parseVTK)
      }
      else{
          throw new Error ("Unnkown mesh format - only accepting VTK and UCD (lowercase)");
      }
}

