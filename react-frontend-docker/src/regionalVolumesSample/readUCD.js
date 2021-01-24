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

export function readUCD(blob) {
    function readFile(blob){
        return new Promise((resolve, reject) => {
          var fr = new FileReader();  
          fr.onload = () => {
            resolve(fr.result )
          };
          fr.readAsText(blob);
        });
      }
      return readFile(blob).then(parseUCD)
}

