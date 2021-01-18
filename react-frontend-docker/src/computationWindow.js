import React from 'react';
import  { Button} from 'react-bootstrap';
import StyledDropzone from './styledDropzone';
import {CircularProgressbar } from 'react-circular-progressbar';
import {volume, readUCD} from './regionalVolumesSample/readUCD';
import {doPartitionGeodesics, computeRegionalVolumeSampling, copyPartition} from './regionalVolumesSample/doPartitionGeodesics';
import {MeshesList} from './dataStructures';
import "./styles/index.css"

  
class ComputationWindow extends React.Component {
    constructor(props) {
      super(props);
    
      this.state = {patientsToCompute : new MeshesList(), numberToCompute : 1, numberComputed: 1,  mode : 'local'};

      this.addFiles = this.addFiles.bind(this);
      this.sendPatientFile = this.sendPatientFile.bind(this);   
      this.sendAllPatients = this.sendAllPatients.bind(this);   
      this.generateAndDownload = this.generateAndDownload.bind(this);      
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

    sendPatientFile(k){
      /*
      WARNING: not sure how this handles concurent accesses... better work one by one.
      */
      if (this.state.patientsToCompute.get(k).keys().length !== (1 + Math.max(...this.state.patientsToCompute.get(k).keys()))) {
        this.setState({numberComputed: this.state.numberComputed + 1})
        return
      }
      var aux =  this.state.patientsToCompute.get(k).get(0).name.split('.').pop();

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
          // read the meshes
          //console.log(fullCycleFiles[0])
          Promise.all(fullCycleFiles.map(readUCD)).then(
            function(results) {
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
              return newResult;
            }).then(
              function(results){
                let partitionED = doPartitionGeodesics(results.ED);
                let partitionES = copyPartition(results.ES, partitionED);
                let volsED = computeRegionalVolumeSampling(partitionED);
                let volsES = computeRegionalVolumeSampling(partitionES);
  
                // TODO: Same code as in the server approach for computing: Do a function
                global.props.addNewResult(k, volsED, volsES, partitionED, partitionES, false)
                let patientsToCompute = global.state.patientsToCompute
                patientsToCompute.removeFile(k)
                global.setState({patientsToCompute : patientsToCompute, numberComputed: global.state.numberComputed + 1})
              }
            )        
          return
  
      }
    }
    
    sendAllPatients(){
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
        for (var i = 1; i < item.length; i++) {
          item[i] = Number(item[i]).toFixed(3)
        }
        let row = item.join(";");
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
                <Button variant="dark" onClick={this.sendAllPatients} class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"> 
                Parcellate!  </Button>
                <Button variant="dark" disabled= {this.state.numberComputed !== this.state.numberToCompute} onClick={this.generateAndDownload} class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                   Download CSV</Button>

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
                    <img  title="Our oompa loompa is processing. Please wait." src={require('./public/processing.gif')} alt="loading..."  align="middle" />
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