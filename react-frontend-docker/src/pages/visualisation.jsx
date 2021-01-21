// see for inspiration https://codesandbox.io/s/r3f-contact-shadow-h5xcw?file=/src/index.js
// three js fiber (react version of three js)
import ReactDOM from 'react-dom'
import React, { Suspense , useState, useRef, useEffect } from 'react'
import { Canvas } from 'react-three-fiber'
import { OrbitControls, TrackballControls} from 'drei'
import * as THREE from "three";


function RightVentricleMesh(props) {
  const mesh = useRef()
  //console.log(props.rv)
  
  //const vertices = useMemo(() => props.rv[7].V.map(v => new THREE.Vector3(v.x, v.y, v.z)), [])
  //const faces = useMemo(() => props.rv[7].E.map(f => new THREE.Face3(...f)), [])


  const geometry = new THREE.Geometry();
  for (let i = 0; i < props.rv[7].V.length; i++) {
    geometry.vertices.push(new THREE.Vector3(...props.rv[7].Varray[i]))
  }
  for (let i = 0; i < props.rv[7].E.length; i++) {
    geometry.faces.push(new THREE.Face3(...props.rv[7].E[i]))
  }

  geometry.computeBoundingSphere();  
  geometry.center();
  const edges = new THREE.EdgesGeometry( geometry );
  const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff } ) );
    return (
    <mesh ref={mesh} geometry={geometry}> 
      {/*<geometry attach="geometry" vertices={vertices} faces={faces} onUpdate={self => self.computeFaceNormals()} /> */}
      <meshStandardMaterial color={'#820263'}  />
    </mesh>
  )

}


const VisualisationPage = (props ) => {
  //Add a selector of which mesh
  const [state, setState] = useState({height: window.innerHeight *0.8})

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



  if (props.patientsComputed.length === 0){
    return (<div>You need to compute some results before being able to display.</div>);
  }
  else {
    let mesh= RightVentricleMesh({rv: props.patientsComputed[0]});
    let sphere = mesh.props.geometry.boundingSphere;
    return (
      <div align="middle">
      <Canvas  style={{height: state.height, width:'95%', textAlign:'center', background: '#D3D3D3'}} camera={{ position: [0, 0, -3 * sphere.radius], far: 5 * sphere.radius}}>
        <ambientLight />
        <Suspense>
        {mesh}
        </Suspense>
        <TrackballControls  rotateSpeed={4} />
      </Canvas>
      </div>
    )
    }
  }
  
  export default VisualisationPage;