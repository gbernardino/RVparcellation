// see for inspiration https://codesandbox.io/s/r3f-contact-shadow-h5xcw?file=/src/index.js
// three js fiber (react version of three js)
import React, { Suspense , useState, useRef, useEffect } from 'react'
import { Canvas} from 'react-three-fiber'
import { TrackballControls} from 'drei'
import * as THREE from "three";
import { Dropdown } from 'semantic-ui-react';


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
    geometry.vertices.push(new THREE.Vector3(...props.rv[7].Varray[i]))
  }
  for (let i = 0; i < mesh.E.length; i++) {
    geometry.faces.push(new THREE.Face3(...props.rv[7].E[i]))

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
    const [selected, setSelected] = useState(undefined);
    let patientsOption = props.patientsComputed.map(
      (p, index) => { 
        return { key: p[0], value: index, text: p[0] };
      }
    )

    return (
      <div align="middle">
      <div>
        <Dropdown
              placeholder='Select patient'
              fluid
              search
              selection
              options={patientsOption}
              onSelectedChange={setSelected}
        />
        <div>
          <input type="radio" value="ED" name="phase" /> End-diastole
          <input type="radio" value="ES" name="phase" /> End-systole
        </div>
      </div>

      { selected  !== undefined 
        ? <MeshDisplayCanvas mesh = {props.patientsComputed[selected][7]} />
        : <div> No patient selected to display. </div>
      }   
      </div>
    )
  }
  
  export default VisualisationPage;