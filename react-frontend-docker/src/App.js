import React from 'react';
import logo from './logo.svg';
import  { Button} from 'react-bootstrap';
import './App.css';
import StyledDropzone from './styledDropzone';
import {CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import readUCD from './regionalVolumesSample/readUCD';
import {doPartitionGeodesics, computeRegionalVolumeSampling} from './regionalVolumesSample/doPartitionGeodesics';

class Dictionary{
  constructor() {
    this.data = {};
  }
  get(k, callbackIfKeyNotFound = null) {
    if (this.data[k] === undefined && callbackIfKeyNotFound === null)  {
      this.set(k, callbackIfKeyNotFound())
      return this.data[k]
    }
    else if (this.data[k] === undefined) { 
      throw `key: '${k}' not in dictionary`;
    }
    else {
      return this.data[k]
    }
  }

  set(k, v){
    console.log('Set ', k, v)
    this.data[k]= v;
  }
  keys() {
    return Object.keys(this.data)
  }
  length() {
    return this.keys().length
  }
}

class MeshesList extends Dictionary {
  //Class representing all meshes of all patients (saved as BLOBS of a single patient. Relies on the correct index, and the correct format)


  addNewFile(file) {

    //TODO: check name is correct.
    //END TODO

    let nameSplit = file.name.split('_');
    let pId = nameSplit.slice(0, -1).join('_');
    let time = parseInt(nameSplit[nameSplit.length - 1].split('.')[0]);
    if (! (pId in this.data) ) {
      this.set(pId, new Dictionary());
    }


    let patient = this.get(pId);
    patient.set(time, file);
  }

  removeFile(pId) {
    console.log('Removing', pId)
    console.log(this)
    delete this.data[pId]
  }

  isOK() {
    //Returns OK if the files is complete: ie, if there are all the frames from 0 to max
    return  this.keys().every(k => this.get(k).keys() == Math.max(...this.get(k).keys()) );
    }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {patientsToCompute : new MeshesList(), numberToCompute : 1, numberComputed: 1, patientResults: [],  mode : 'local'};
  
    this.addFiles = this.addFiles.bind(this);
    this.sendPatientFile = this.sendPatientFile.bind(this);   
    this.sendAllPatients = this.sendAllPatients.bind(this);   

    this.generateAndDownload = this.generateAndDownload.bind(this);
    this.testPost = this.testPost.bind(this);
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
    if (this.state.patientsToCompute.get(k).keys().length != (1 + Math.max(...this.state.patientsToCompute.get(k).keys()))) {
      this.setState({numberComputed: this.state.numberComputed + 1})
      return
    }
    if (this.state.mode == 'docker' ) {
      console.log('Sending new patient')
      var myHeaders = new Headers();
      var formData = new FormData();
      formData.append('pId', k)
      var aux =  this.state.patientsToCompute.get(k).get(0).name.split('.').pop()
      formData.append('format', aux)
      this.state.patientsToCompute.get(k).keys().forEach(t =>  formData.append(t, this.state.patientsToCompute.get(k).get(t) ));
      var myData = { method: 'POST',
                    headers: myHeaders,
                    mode: 'cors',
                    body: formData
                    };
      var persistentData = this;

      fetch('http://localhost:5000/computePartitionSingleIndividual', myData)
      .then(function(response) {
        response.json().then(function(data) {
          console.log(data);
          let patientResults = persistentData.state.patientResults
          let patientsToCompute = persistentData.state.patientsToCompute
          patientResults.push([k, data.outflowEDV, data.inletEDV, data.apicalEDV, data.outflowEF, data.inletEF, data.apicalEF])
          patientsToCompute.removeFile(k)
          persistentData.setState({patientResults: patientResults, patientsToCompute : patientsToCompute, numberComputed: persistentData.state.numberComputed + 1})
        
          //Update the state
          });
  
      });
    }
    else { 
        //
        var pId = k;
        var aux =  this.state.patientsToCompute.get(k).get(0).name.split('.').pop();
        var fullCycleFiles = Array();
        this.state.patientsToCompute.get(k).keys().forEach(t =>  fullCycleFiles.push(this.state.patientsToCompute.get(k).get(t) ));
        // read the meshes
        //console.log(fullCycleFiles[0])
        readUCD(fullCycleFiles[0]).then(doPartitionGeodesics).then(computeRegionalVolumeSampling)
        // Use geometry processing to generate the geodesic distances

                // DEBUGGING: download the files with the geodesic distances, to Compare

        // Compute volumes from mean point

        // Sample each tetrahedron according to its volume
        
        return

    }
  }
  
  sendAllPatients(){
    //TODO: Check that it is correct
      console.log(this.state.patientsToCompute.length)
      this.setState({numberToCompute: this.state.patientsToCompute.length(), numberComputed : 0})
      this.state.patientsToCompute.keys().forEach(k => this.sendPatientFile(k))
  }

  testPost(){
    var myHeaders = new Headers();
    var myData = { method: 'GET',
      headers: myHeaders,
      mode: 'cors',
    };
    var persistentData = this;
    console.log(this)
    fetch('http://localhost:5000/testGet', myData)
    .then(function(response) {
      response.json().then(function(data) {
        console.log(data);
        console.log(persistentData.patientResults)
        persistentData.patientResults.push(['Dummy', 1., 2.5, 3., 4.,5., 6.])
        });
 
    });

  }
  generateAndDownload(){
    /*
    Generates a csv file, and downloads it
    */
    var csvContent ="data:text/csv;charset=utf-8,";
    let items = ['pID', 'outflowEDV', 'inletEDV', 'apicalEDV', 'outflowEF', 'inletEF', 'apicalEF'];
    var columnNames = items.join(";");
    csvContent += columnNames + "\r\n";
    this.state.patientResults.forEach(function (item, index) {
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
    var patientsComputed = this.state.patientResults;
    let percentage = 100 * this.state.numberComputed / this.state.numberToCompute
    return (
      <div className="App">
        <header className="App-header">
          Right ventricular parcellator.
        </header>
        <body>
          <aside>
          {this.state.numberComputed == this.state.numberToCompute ?
            ( <div> 
              <StyledDropzone onDrop={this.addFiles } />
              <Button variant="primary" onClick={this.sendAllPatients}> Parcellate!  </Button>
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
            <Button variant="primary"  onClick={this.testPost}> Add dummy result </Button>
            <Button variant="primary"  disabled= {this.state.numberComputed != this.state.numberToCompute} onClick={this.generateAndDownload}> Download CSV</Button>

      </aside>
        </body>
      </div>
    );
  }

}

export default App;
/*<CircularProgressbar
percentage={percentage}
text={`${percentage.toFixed(2)}%`}
/>
*/