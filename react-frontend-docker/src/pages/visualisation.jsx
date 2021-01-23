// see for inspiration https://codesandbox.io/s/r3f-contact-shadow-h5xcw?file=/src/index.js
// three js fiber (react version of three js)
import ReactDOM from 'react-dom'
import React, { Suspense , useState, useRef, useEffect } from 'react'
import { Canvas, MeshNormalMaterial } from 'react-three-fiber'
import { OrbitControls, TrackballControls} from 'drei'
import * as THREE from "three";


function RightVentricleMesh(props) {
  //console.log(props.rv)
  
  //const vertices = useMemo(() => props.rv[7].V.map(v => new THREE.Vector3(v.x, v.y, v.z)), [])
  //const faces = useMemo(() => props.rv[7].E.map(f => new THREE.Face3(...f)), [])
  const mesh = useRef()
  const wireframe = useRef()

  const geometry = new THREE.Geometry();
  for (let i = 0; i < props.rv[7].V.length; i++) {
    geometry.vertices.push(new THREE.Vector3(...props.rv[7].Varray[i]))
  }
  for (let i = 0; i < props.rv[7].E.length; i++) {
    geometry.faces.push(new THREE.Face3(...props.rv[7].E[i]))

    // Add coloring according to closest point
    for (let j = 0; j < 3; j++){
      var color;
      var ii = props.rv[7].E[i][j]
      if (props.rv[7].dA[ii] < props.rv[7].dP[ii] && props.rv[7].dA[ii] < props.rv[7].dT[ii]) {
        color = new THREE.Color(0xf8521)
      }
      else if ( props.rv[7].dT[ii] < props.rv[7].dP[ii]) {
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
    
  props.radius.current.radius = geometry.boundingSphere.radius;
  let material = new THREE.MeshStandardMaterial({vertexColors:THREE.VertexColors}) 

// wireframe
  var geoWireframe = new THREE.WireframeGeometry( geometry ); // or WireframeGeometry
  var matWireframe = new THREE.LineBasicMaterial( { color: 0x0, linewidth: 5, polygonOffset : true, polygonOffsetFactor: 2, polygonOffsetUnits: 1} );

  geometry.computeFaceNormals();

  return (
    <group>
       <mesh ref={mesh} geometry={geometry} material={material}/ >
       <lineSegments ref={wireframe} geometry={geoWireframe} material={matWireframe}/ >

    </group>
  )
}


const VisualisationPage = (props ) => {
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



  if (props.patientsComputed.length === 0){
    return (<div>You need to compute some results before being able to display.</div>);
  }
  else {
    let mesh= RightVentricleMesh({rv: props.patientsComputed[0], radius: radius});
    return (
      <div align="middle">
      <Canvas   style={{height: state.height, width:'95%', textAlign:'center', background: '#D3D3D3'}} camera={{ position: [0, 0, -3 * radius.current.radius], far: 5 * radius.current.radius}}>
        <ambientLight />
        <Suspense fallback={null}>
        {mesh}
        </Suspense >
        <TrackballControls  rotateSpeed={4} />
      </Canvas>
      </div>
    )
    }
  }
  
  export default VisualisationPage;