import React from 'react';
import  { Button} from 'react-bootstrap';
import StyledDropzone from './components/styledDropzone';
import {CircularProgressbar } from 'react-circular-progressbar';
import {volume, readFile} from './regionalVolumesSample/readUCD';
import {doPartitionGeodesics, computeRegionalVolumeSampling, copyPartition} from './regionalVolumesSample/doPartitionGeodesics';
import {MeshesList} from './dataStructures';
import "./styles/index.css"
import {Link} from 'react-router-dom'
  
import {computeRegionalVolumeSamplingWASM, geodesicsWASM} from './regionalVolumesSample/samplingWASM'
import InterpolateSampling from './interpolateSampling.js';
import InterpolateSamplingWASM from './interpolateSampling.wasm';

const interpolate = InterpolateSampling({
  locateFile: () => {
      return InterpolateSamplingWASM;
  },
});
class ComputationWindow extends React.Component {
    constructor(props) {
      super(props);
    
      this.state = {patientsToCompute : new MeshesList(), numberToCompute : 1, numberComputed: 1,  mode : 'local'};

      this.componentDidMount = this.componentDidMount.bind(this);      
      this.addFiles = this.addFiles.bind(this);
      this.sendPatientFile = this.sendPatientFile.bind(this);   
      this.sendAllPatients = this.sendAllPatients.bind(this);   
      this.generateAndDownload = this.generateAndDownload.bind(this);      
    }

    async componentDidMount() {
      this.setState({module: undefined});

      try {
          const wasm = await interpolate;
          this.setState({module: wasm});
      }
      catch {
        this.setState({module: false});
      }
    }

    addFiles(acceptedFiles) {
      /*
      Add files to patients.
      TODO: Do not add if it is already computed 
      */
      let patients = this.state.patientsToCompute;
      console.log(acceptedFiles);
      acceptedFiles.forEach(blob => patients.addNewFile(blob));
      this.setState({ patients: patients});
    }

    sendPatientFile(k, chainExecution = false){
      /*
      WARNING: not sure how this handles concurent accesses... better work one by one.
      */
     var t1 = Date.now()
      if (this.state.patientsToCompute.get(k).keys().length !== (1 + Math.max(...this.state.patientsToCompute.get(k).keys()))) {
        this.setState({numberComputed: this.state.numberComputed + 1})
        return
      }
      var aux =  this.state.patientsToCompute.get(k).get(0).name.split('.').pop();
      var moduleWASM = this.state.module
      if (this.state.mode === 'docker' ) {
        console.log('Sending new patient')
        var myHeaders = new Headers();
        var formData = new FormData();
        formData.append('pId', k)
        formData.append('format', aux)
        this.state.patientsToCompute.get(k).keys().forEach(t =>  formData.append(t, this.state.patientsToCompute.get(k).get(t) ));
        var myData = { method: 'POST',
                      headers: myHeaders,
                      mode: 'cors',
                      body: formData
                      };
  
        fetch('http://localhost:5000/computePartitionSingleIndividual', myData)
        .then(function(response) {
          response.json().then(function(data) {
            let patientsToCompute = global.state.patientsToCompute
            patientsToCompute.removeFile(k)
            global.setState({patientsToCompute : patientsToCompute, numberComputed: global.state.numberComputed + 1})
            global.props.addNewResult(k, [data.outflowEDV, data.inletEDV, data.apicalEDV], [data.outflowEF, data.inletEF, data.apicalEF], undefined, undefined, true)
            });
    
        });
      }
      else { 
          let global = this;
          var fullCycleFiles = [];
          this.state.patientsToCompute.get(k).keys().forEach(t =>  fullCycleFiles.push(this.state.patientsToCompute.get(k).get(t) )); // This can prob be simplified...
          Promise.all(fullCycleFiles.map(readFile)).then(
            function(results){
              var t2 = Date.now()
              console.log('Time parsing files', t2 - t1)
              var iMinVol = -1;
              var totalVol = 1e20;
              for (let i = 1; i < results.length; i++ ) {
                let v = volume(results[i][0], results[i][1]);
                if (totalVol > v) {
                    iMinVol = i;
                    totalVol = v;
                }
              }
              console.log('iMin', iMinVol)
              let newResult = {};
              newResult.ED = results[0];
              newResult.ES = results[iMinVol];
              console.log( 'Selecting ES =', Date.now() - t2)

              return newResult;
              
            }).then(
              function(results){
                var tBeginGeodesics = Date.now();
                var partitionED;
                if(moduleWASM === false)  {
                    partitionED = doPartitionGeodesics(results.ED);
                }
                else{
                    partitionED = geodesicsWASM(moduleWASM, results.ED);

                }
                let partitionES = copyPartition(results.ES, partitionED);
                var volsED, volsES;
                var tBeginSampling = Date.now();
                console.log( 'Time geodesics =', tBeginSampling - tBeginGeodesics)

                if (moduleWASM === false) {
                  console.log('Could not load the WASM module, Fallback to Javascript')
                  volsED = computeRegionalVolumeSampling(partitionED);
                  volsES = computeRegionalVolumeSampling(partitionES);
                }
                else{
                  volsED = computeRegionalVolumeSamplingWASM(moduleWASM, partitionED);
                  volsES = computeRegionalVolumeSamplingWASM(moduleWASM, partitionES);
                }
                console.log( 'Sampling volume =', Date.now() - tBeginSampling)

                // TODO: Same code as in the server approach for computing: Do a function
                global.props.addNewResult(k, volsED, volsES, partitionED, partitionES, false)
                let patientsToCompute = global.state.patientsToCompute
                patientsToCompute.removeFile(k)
                global.setState({patientsToCompute : patientsToCompute, numberComputed: global.state.numberComputed + 1})
                console.log( 'Total patient processing time =', Date.now() - t1)

                if (chainExecution && patientsToCompute.length() > 0){
                  let k = patientsToCompute.keys()[0];
                  global.sendPatientFile(k, chainExecution)
                }
              }
            )        
          return
  
      }
    }
    
    sendAllPatients(){
      //TODO: Check that it is correct
        this.setState({numberToCompute: this.state.patientsToCompute.length(), numberComputed : 0})
        let k = this.state.patientsToCompute.keys()[0];
        this.sendPatientFile(k, true)

    }
    sendAllPatientsConcurrent(){
      //TODO: Check that it is correct
        this.setState({numberToCompute: this.state.patientsToCompute.length(), numberComputed : 0})
        this.state.patientsToCompute.keys().forEach(k => this.sendPatientFile(k))
    }
  
  
    generateAndDownload(){
      /*
      Generates a csv file with all the processed measurements, and downloads it
      */
      var csvContent ="data:text/csv;charset=utf-8,";
      let items = ['pID', 'outflowEDV', 'inletEDV', 'apicalEDV', 'outflowEF', 'inletEF', 'apicalEF'];
      var columnNames = items.join(";");
      csvContent += columnNames + "\r\n";
      this.props.patientsComputed.forEach(function (item, index) {
        var rowInteger = new Array(items.length)
        rowInteger[0] = item[0];
        for (var i = 1; i < items.length; i++) {
          rowInteger[i] = Number(item[i]).toFixed(3)
        }
        let row = rowInteger.join(";");
        csvContent += row + "\r\n";
      });
  
  
      var encodedUri = encodeURI(csvContent);
      var link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "regionalVolumes.csv");
      document.body.appendChild(link); // Required for FF
  
      link.click(); 
    }

    render () {
      let patients = this.state.patientsToCompute;
      var patientsComputed = this.props.patientsComputed;
      let percentage = 100 * this.state.numberComputed / this.state.numberToCompute;
      return (
        <div className="Computation">
            <aside>
            {this.state.numberComputed === this.state.numberToCompute ?
              ( <div> 
                <StyledDropzone onDrop={this.addFiles } />
                <Button variant="dark" onClick={this.sendAllPatients} style = {{fontSize: 18}}> 
                Parcellate!  </Button>
                <Button variant="dark" disabled= {this.state.numberComputed !== this.state.numberToCompute && this.state.module !== undefined} 
                                  onClick={this.generateAndDownload} style = {{fontSize: 18}}>
                   Download CSV</Button>
                <Link to="/visualisation">
                    <button type="button" style = {{fontSize: 18}}>
                          Visualisation
                    </button>
                </Link>
                </div>
              )
              :
              (
                <div class = 'container'> 
                   <CircularProgressbar
                    value={percentage}
                    maxValue={100}
                    minValue={0}
                    text={`${this.state.numberComputed}/${this.state.numberToCompute}`}
                    />
                </div>
              )
            }
            <div class="row">
              <div class="column">
  
                        <h4>Patients to compute </h4>
                        <ul>{patients.keys().map(pId => (<li key={pId}>
                          <font color={  patients.get(pId).keys().length === (1 + Math.max(...patients.get(pId).keys())) ? "black" : "red"}>
                            {pId}  -  { patients.get(pId).keys().length} / {1 + Math.max(...patients.get(pId).keys())}
                          </font> 
                          </li> ) 
                          )}
                        </ul>
                  </div>
              <div class="column">
              <h4>Patients computed </h4>
              <ul>{patientsComputed.map(pId => (<li key={pId[0]}>
                          <font color="Black">
                            {pId[0]}  
                          </font> 
                          </li> ) 
                          )}
                        </ul>
                </div>
          </div> 
            {/* <Button variant="primary"  onClick={this.testPost}> Add dummy result </Button> */}
  
            </aside>
        </div>
      );
    }
  
  }
  export default ComputationWindow;