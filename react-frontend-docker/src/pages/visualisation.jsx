// see for inspiration https://codesandbox.io/s/r3f-contact-shadow-h5xcw?file=/src/index.js
// three js fiber (react version of three js)
import React, { Suspense , useState, useRef, useEffect } from 'react'
import { Canvas} from 'react-three-fiber'
import { TrackballControls} from 'drei'
import * as THREE from "three";
import Select from 'react-select'
import SplitPane, { Pane } from 'react-split-pane';

const  RightVentricleMesh = (props) => {
  //console.log(props.rv)
  
  //const vertices = useMemo(() => props.rv[7].V.map(v => new THREE.Vector3(v.x, v.y, v.z)), [])
  //const faces = useMemo(() => props.rv[7].E.map(f => new THREE.Face3(...f)), [])
  const meshRef = useRef()
  const wireframe = useRef()

  var mesh = props.mesh;
  var radius = props.radius;

  const geometry = new THREE.Geometry();
  for (let i = 0; i < mesh.V.length; i++) {
    geometry.vertices.push(new THREE.Vector3(...mesh.Varray[i]))
  }
  for (let i = 0; i < mesh.E.length; i++) {
    geometry.faces.push(new THREE.Face3(...mesh.E[i]))

    // Add coloring according to closest point
    for (let j = 0; j < 3; j++){
      var color;
      var ii = mesh.E[i][j]
      if (mesh.dA[ii] < mesh.dP[ii] && mesh.dA[ii] < mesh.dT[ii]) {
        color = new THREE.Color(0xf8521)
      }
      else if ( mesh.dT[ii] < mesh.dP[ii]) {
        color = new THREE.Color(0x0f4285)
      }
      else{
        color = new THREE.Color(0x85180f)
      }
  
      geometry.faces[i].vertexColors[j] = color;
  
    }
  }

  geometry.computeBoundingSphere();  
  geometry.center();
    
  radius.current = geometry.boundingSphere.radius;
  let material = new THREE.MeshStandardMaterial({vertexColors:THREE.VertexColors}) 

// wireframe
  var geoWireframe = new THREE.WireframeGeometry( geometry ); // or WireframeGeometry
  var matWireframe = new THREE.LineBasicMaterial( { color: 0x0, linewidth: 5, polygonOffset : true, polygonOffsetFactor: 2, polygonOffsetUnits: 1} );

  geometry.computeFaceNormals();

  return (
    <group>
       <mesh ref={meshRef} geometry={geometry} material={material}/ >
       <lineSegments ref={wireframe} geometry={geoWireframe} material={matWireframe}/ >

    </group>
  )
}

const MeshDisplayCanvas = (props ) => {
  //Add a selector of which mesh
  const [state, setState] = useState({height: window.innerHeight *0.8})
  let radius = React.useRef([])

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setState({height: window.innerHeight *0.8})
    }

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);

  }, []); // Empty array ensures that effect is only run on mount



  let mesh = RightVentricleMesh( {mesh: props.mesh,radius:radius});
  return (
    <Canvas   style={{height: state.height, width:'95%', textAlign:'center', background: '#D3D3D3'}} camera={{ position: [0, 0, -3 * radius.current], far: 5 * radius.current}}>
      <ambientLight />
      <Suspense fallback={null}>
      {mesh}
      </Suspense >
      <TrackballControls  rotateSpeed={4} />
    </Canvas>
  )
  
  }



const VisualisationPage = (props ) => {
    const [patientSelected, setPatientSelected] = useState();
    const [phaseSelected, setPhaseSelected] = useState();

    const patientsOption = props.patientsComputed.map(
      (p, index) => { 
        return { value: index, label: p[0] };
      }
    )
    const phaseOptions = [{value: 'ED', label: 'End-diastole'}, {value: 'ES', label: 'End-systole'}];

    return (
      <div align="middle">
      <SplitPane split="vertical" minSize={100} defaultSize={200} primary="first">
      <div>
        <h3> Select patient</h3>
        <Select
              options={patientsOption}
              onChange={(v) => {
                setPatientSelected(v.value)
                console.log(patientSelected, v)
              } 
            }
        />
        <h3> Select phase</h3>

 
        <Select
                  className="basic-single"
                  classNamePrefix="select"
              options={phaseOptions}
              onChange={(v) => {setPhaseSelected(v.value)
              console.log(phaseSelected, v)
             } }
        />
      <h2> Measurements </h2>
      {
        (patientSelected  !== undefined)
        ? <table>
        <tbody>
        <tr><td>RVOT EDV </td>  {(props.patientsComputed[patientSelected][1] /1e3).toFixed(1) }</tr>
        <tr><td>Inlet EDV</td>  {(props.patientsComputed[patientSelected][2] /1e3).toFixed(1)}</tr>
        <tr><td>Apical EDV</td> {(props.patientsComputed[patientSelected][3] /1e3).toFixed(1)}</tr>
        <tr><td>RVOT EF </td>   {(props.patientsComputed[patientSelected][4] ).toFixed(1)}</tr>
        <tr><td>Inlet EF</td>   {(props.patientsComputed[patientSelected][5] ).toFixed(1)}</tr>
        <tr><td>Apical EF</td>  {(props.patientsComputed[patientSelected][6] ).toFixed(1)}</tr>

        </tbody>
        </table>
        : <div> Select a patient for displaying here the measurements</div>

      }

      </div>


      { (patientSelected  !== undefined  && phaseSelected !== undefined)
        ? <MeshDisplayCanvas mesh = {props.patientsComputed[patientSelected][phaseSelected === 'ED' ? 7 : 8 ]}  />
        : <div> No patient selected to display. </div>
      }
      </SplitPane>   
      </div>
    )
  }
  
  export default VisualisationPage;