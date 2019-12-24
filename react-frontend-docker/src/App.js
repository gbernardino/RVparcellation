import React from 'react';
import logo from './logo.svg';
import  { Button} from 'react-bootstrap';
import './App.css';
import StyledDropzone from './styledDropzone';

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

  isOK() {
    //Returns OK if the files is complete: ie, if there are all the frames from 0 to max
    return  this.keys().every(k => this.get(k).keys() == Math.max(...this.get(k).keys()) );
    }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {patients : new MeshesList(), isLoading : false};
    this.addFiles = this.addFiles.bind(this);
    this.sendPatientFile = this.sendPatientFile.bind(this);
    this.sendAllPatients = this.sendAllPatients.bind(this);
  }

  addFiles(acceptedFiles) {
    let patients = this.state.patients;
    console.log(acceptedFiles);
    acceptedFiles.forEach(blob => patients.addNewFile(blob));
    this.setState({ patients: patients});
    this.sendPatientFile(this.state.patients.keys()[0]);
  }

  sendPatientFile(k){
    var myHeaders = new Headers();
    var formData = new FormData();
    formData.append('pId', k)
    formData.append('format', this.state.patients.get(k).get(0).name.split('.').pop())

    this.state.patients.get(k).keys().forEach(t =>  formData.append(t, this.state.patients.get(k).get(t) ));
    var myData = { method: 'POST',
                  headers: myHeaders,
                  mode: 'cors',
                  body: formData
                  };

    fetch('http://localhost:5000/computePartitionSingleIndividual', myData)
    .then(function(response) {
      return response.blob();
    })
    .then(function(miBlob) {
      console.log(miBlob)
    });
  }
  sendAllPatients(){
    //TODO: Check that it is correct
      this.setState({isLoading: true})
      this.state.patients.keys().forEach(k => this.sendPatientFile(k))
      this.setState({isLoading: false})

  }
  render () {
    let patients = this.state.patients;
    return (
      <div className="App">
        <header className="App-header">
          Right ventricular parcellator.
        </header>
        <body>
          <StyledDropzone onDrop={this.addFiles } />
          <aside>
            <h4>Patients</h4>
            <Button variant="primary" disabled={!(this.state.isLoading) && this.state.patients.isOK()} onClick={this.sendAllPatients}> Parcellate!</Button>
            <ul>{patients.keys().map(pId => (<li key={pId}>
              <font color={  patients.get(pId).keys().length === (1 + Math.max(...patients.get(pId).keys())) ? "black" : "red"}>
                {pId}  -  { patients.get(pId).keys().length} / {1 + Math.max(...patients.get(pId).keys())}
              </font> 
              </li> ) 
              )}
            </ul>
      </aside>
        </body>
      </div>
    );
  }

}

export default App;
