// see for inspiration https://codesandbox.io/s/r3f-contact-shadow-h5xcw?file=/src/index.js
// three js fiber (react version of three js)
import ReactDOM from 'react-dom'
import React, { Suspense , useState, useRef, useMemo } from 'react'
import { Canvas, useLoader } from 'react-three-fiber'
import { OrbitControls } from 'drei'
import * as THREE from "three";


function RightVentricleMesh(props) {
  const mesh = useRef()
  const [state, setState] = useState({isHovered: false, isActive: false})
  //console.log(props.rv)
  
  //const vertices = useMemo(() => props.rv[7].V.map(v => new THREE.Vector3(v.x, v.y, v.z)), [])
  //const faces = useMemo(() => props.rv[7].E.map(f => new THREE.Face3(...f)), [])

  const geometry = new THREE.Geometry();
    geometry.vertices.push(
      new THREE.Vector3( -10,  10, 0 ),
      new THREE.Vector3( -10, -10, 0 ),
      new THREE.Vector3(  10, -10, 0 )
    );

    geometry.faces.push( new THREE.Face3( 0, 1, 2 ) );

    geometry.computeBoundingSphere();  
    geometry.center();
  return (
    <mesh ref={mesh} geometry={geometry}> 
      {/*<geometry attach="geometry" vertices={vertices} faces={faces} onUpdate={self => self.computeFaceNormals()} /> */}
      <meshStandardMaterial color={state.isActive ? '#820263' : '#D90368'} />
    </mesh>
  )

}
const VisualisationPage = (props ) => {
  //Add a selector of which mesh
  
  if (props.patientsComputed.length === 0 && false){
    return (<div>You need to compute some results before being able to display.</div>);
  }
  else {
    let mesh = RightVentricleMesh({rv: props.patientsComputed[0]});
    console.log(mesh)
    let sphere = mesh.props.geometry.boundingSphere;
    return (
      <div>
      <Canvas style={{height: '95%', width:'95%', textAlign:'center', background: '#D3D3D3'}} camera={{ position: [0, 0, -3 * sphere.radius], far: 5 * sphere.radius}}>
        <ambientLight />
        <Suspense>
        {mesh}

        </Suspense>
        <OrbitControls />
      </Canvas>
      </div>
    )
    }
  }
  
  export default VisualisationPage;