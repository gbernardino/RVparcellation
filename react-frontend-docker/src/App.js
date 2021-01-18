import React from 'react';
import logo from './logo.svg';
import './App.css';
import ComputationWindow from './computationWindow.js';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {patientResults: [],  mode : 'local'};

    this.addNewResult = this.addNewResult.bind(this);
    this.getComputedData = this.getComputedData.bind(this);   
  }

  addNewResult(k, volsED, volsES, meshED, meshES, efComputed){
    var ef;
    if (efComputed){
      ef = (ed, es) => es;

    }
    else{
       ef = (ed, es) => 100 * (ed - es)/ed;
    }
    let patientResults = this.state.patientResults
    patientResults.push([k, volsED[0], volsED[1], volsED[2], ef(volsED[0], volsES[0]), ef(volsED[1], volsES[1]), ef(volsED[2], volsES[2]), meshED, meshES])
    this.setState({patientResults : patientResults})
  }

  getComputedData(){
    return this.state.patientResults;
  }

  render () {
    return (
      <div className="App">
        <header className="App-header">
          Right ventricular parcellator.
        </header>
        <body>
        <ComputationWindow addNewResult = {this.addNewResult} patientsComputed = {this.state.patientResults} />
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