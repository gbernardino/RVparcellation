import React from 'react'
import StyledDropzone from '../components/styledDropzone';

import {PartitionSpeckleTrackingContour, parseGESTFile} from './readGESpeckleTrackingContour.js'
import Plot from 'react-plotly.js';

function polylineToPolygon(v){
    let n = Math.round(v.length/2);
    let x = new Float32Array(n + 1);
    let y = new Float32Array(n + 1);
    for (let i = 0; i < n; i++){
        x[i]= v[2*i];
        y[i] = v[2*i + 1];
    }
    x[n] = v[0];
    y[n] = v[1];
    return [x, y];
}
function myMax(a, b){
    return Math.max(Math.max(...a.map(v => Math.max(...v))),
                    Math.max(...b.map(v => Math.max(...v)))
                );
}
function myMin(a, b){
    return Math.min(Math.min(...a.map(v => Math.min(...v))),
        Math.min(...b.map(v => Math.min(...v)))
    );
}

class DisplayWindowST2D extends React.Component {
    constructor(props) {
        super(props);
      
        this.state = {xApex : [[]], yApex : [[]], xBase: [[]], yBase: [[]], areaA: [0], areaB: [0], t: 0, nFrames : 1,
             xmax:0, xmin:0, ymax:0, ymin:0,
             FAC: 0, FACA : 0, FACB: 0, EDA: 0, EDAA: 0, EDAB : 0};
  
        this.processFile = this.processFile.bind(this);      
      }
      componentDidMount() {
        const nFramesPerSecond = 30
        this.interval = setInterval(() => this.tick(), 1000/nFramesPerSecond);
      }
    
      tick() {
        this.setState(state => ({
          t: (state.t + 1) % state.nFrames
        }));
      }
    
      componentWillUnmount() {
        clearInterval(this.interval);
      }
    processFile(acceptedFiles) {
        acceptedFiles.forEach(blob => {
            blob.text().then( text => {
                    let parsedData = parseGESTFile(text);
                    let parsedPolylines = parsedData.traces;
                    let ES = parsedData.ES
                    let ED = parsedData.ED
                    console.log(parsedData)
                    let partition = new PartitionSpeckleTrackingContour(parsedPolylines[ED], Math.round(parsedPolylines[ED].length/2));
                    let xApex = [];
                    let yApex = [];
                    let xBasal = [];
                    let yBasal = [];
                    let areaA = [];
                    let areaB = [];
                    for (let i = 0; i < parsedPolylines.length; i ++) {
                        let polylines = partition.computePartition(parsedPolylines[i]);
                        let apical = polylineToPolygon(polylines.apicalPolyline);
                        let basal = polylineToPolygon(polylines.basalPolyline);
    
                        xApex.push(apical[0]);
                        yApex.push(apical[1]);
                        xBasal.push(basal[0]);
                        yBasal.push(basal[1]);
                        areaA.push(polylines.areaApical/100);
                        areaB.push(polylines.areaBasal/100)


                    }

                    let FAC = (areaA[ED] + areaB[ED] - areaA[ES] - areaB[ES])/(areaA[ED] + areaB[ED])
                    let FACA = (areaA[ED]  - areaA[ES])/(areaA[ED] )
                    let FACB = (areaB[ED]  - areaB[ES])/(areaB[ED] )

                    console.log(areaA[0], areaA[ES], Math.min(...areaA), ES);


                    this.setState({xApex: xApex, yApex:yApex, xBase : xBasal, yBase: yBasal, areaA: areaA, areaB: areaB, nFrames : parsedPolylines.length})
                    this.setState({xmax : myMax(xApex, xBasal), xmin: myMin(xApex, xBasal), 
                        ymax: myMax(yApex, yBasal), ymin: myMin(yApex, yBasal)})
                    this.setState({FAC: FAC, FACA : FACA, FACB: FACB, EDA: areaA[ED] + areaB[ED], EDAA: areaA[ED], EDAB : areaB[ED]})
                    clearInterval(this.interval);
                    this.interval = setInterval(() => this.tick(), 1000/parsedData.FR);

                }
            )
        })
    }
    render(){
        let t = this.state.t
        return(
        <div>   
                <StyledDropzone onDrop={this.processFile } accept= {".CSV, .csv"} text={"Drop the CSV!"} />
                <Plot
                    data ={
                        [{
                            x: this.state.xApex[t],
                            y: this.state.yApex[t],
                            name: "Apex",
                            fill: "toself"
                        },
                        {
                            x: this.state.xBase[t],
                            y: this.state.yBase[t],
                            name : "base",
                            fill: "toself"
                        },
                        {
                            x: [this.state.xmin, this.state.xmax],
                            y: [this.state.ymin, this.state.ymax],
                            mode: 'markers'
                        }
                        ]}
                    layout = {{
                        xaxis : {
                            range : [-50, 50]
                        },
                        yaxis: { scaleanchor: "x", 
                        scaleratio:1
                        },
                        title : `Area base = ${this.state.areaB[t].toFixed(0)} cm2, area apex = ${this.state.areaA[t].toFixed(0)} cm2`
                    }}
                ></Plot>

            <table>
            <tbody>
                <tr><td>RV EDA </td>  {this.state.EDA.toFixed(0) }</tr>
                <tr><td>Inlet EDA</td>  {this.state.EDAB.toFixed(0)}</tr>
                <tr><td>Apical EDA</td> {this.state.EDAA.toFixed(0)}</tr>
                <tr><td>Total FAC </td>   {(this.state.FAC * 100).toFixed(2)}</tr>
                <tr><td>Inlet FAC</td>    {(this.state.FACB *100).toFixed(2)}</tr>
                <tr><td>Apical FAC</td>   {(this.state.FACA * 100).toFixed(2)}</tr>

            </tbody>
            </table>
        </div>
        )
    }
}
export default DisplayWindowST2D;