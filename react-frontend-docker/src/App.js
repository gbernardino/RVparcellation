import React from 'react';
import logo from './logo.svg';
import ComputationWindow from './computationWindow.js';
import {
  HashRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import HomePage from './pages/homepage'
import SettingsPage from './pages/settings'
import VisualisationPage from './pages/visualisation'
import AboutPage from './pages/about.jsx'
import './styles/index.css';
import SideBar from "./components/burgerMenu";


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
        <Router  basename="/">
        <SideBar pageWrapId={"page-wrap"} outerContainerId={"App"} />

        <div id="page-wrap">
            <Switch>
              <Route exact path={["/", "/home"]}> 
                <HomePage />
              </Route>
              <Route path="/computation">
                    <ComputationWindow addNewResult = {this.addNewResult} patientsComputed = {this.state.patientResults} />
              </Route>
              <Route path="/about">
                <AboutPage />
              </Route>
              <Route path="/visualisation">
                <VisualisationPage  patientsComputed = {this.state.patientResults} />
              </Route>
              <Route path="/settings">
                <SettingsPage />
              </Route>
            </Switch>
        </div>
        </Router>
       
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