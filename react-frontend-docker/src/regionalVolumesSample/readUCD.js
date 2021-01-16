import {Vector3} from 'math-ds'


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
        if (line[2] != 'tri') {
            throw('UCD has non-triangle face')
        }
        Cells.push([ parseInt(line[3]), parseInt(line[4]), parseInt(line[5])])

        nLine++
    }
    return [Points, Cells]
}

function readUCD(blob) {
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

export default readUCD;