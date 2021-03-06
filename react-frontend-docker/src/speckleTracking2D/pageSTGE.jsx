import React, { Suspense , useState, useRef, useEffect } from 'react'
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

class DisplayWindowST2D extends React.Component {
    constructor(props) {
        super(props);
      
        this.state = {xApex : [], yApex : [], xBase: [], yBase: [], areaA: 0, areaB: 0};
  
        this.processFile = this.processFile.bind(this);      
      }
    processFile(acceptedFiles) {
        acceptedFiles.forEach(blob => {
            blob.text().then( text => {
                    let parsedPolylines = parseGESTFile(text);
                    let partition = new PartitionSpeckleTrackingContour(parsedPolylines[0], Math.round(parsedPolylines[0].length/2));
                    let polylinesT0 = partition.computePartition(parsedPolylines[0]);
                    let apical = polylineToPolygon(polylinesT0.apicalPolyline);
                    let basal = polylineToPolygon(polylinesT0.basalPolyline);
                    this.setState({xApex: apical[0], yApex: apical[1], xBase : basal[0], yBase: basal[1], areaA: polylinesT0.areaApical, areaB: polylinesT0.areaBasal})

                }
            )
        })
    }
    render(){

        return(
        <div>   
                <StyledDropzone onDrop={this.processFile } accept= {".CSV, .csv"} text={"Drop the CSV!"} />
                <Plot
                    data ={
                        [{
                            x: this.state.xApex,
                            y: this.state.yApex,
                            name: "Apex",
                            fill: "toself"
                        },
                        {
                            x: this.state.xBase,
                            y: this.state.yBase,
                            name : "base",
                            fill: "toself"
                        },
                        ]}
                    layout = {{
                        yaxis: { scaleanchor: "x", 
                        scaleratio:1
                        },
                        title : `Area base = ${this.state.areaB.toFixed(0)} mm2, area apex = ${this.state.areaA.toFixed(0)} mm2`
                    }}
                ></Plot>
        </div>
        )
    }
}
export default DisplayWindowST2D;