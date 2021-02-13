import React, { useState } from 'react'
// import the Javascript plumbing file
import AdderPlumbing from '../adder_plumbing.js'

const AdderPromise = AdderPlumbing({
	noInitialRun: true,
	noExitRuntime: true
})


function arrayInt32ToPtr(module, array) {
  let nByte = 4;
  var ptr = module._malloc(array.length * nByte)
  module.HEAP32.set(array, ptr / nByte)
  return ptr
}

function arrayFloat32ToPtr(module, array) {
  let nByte = 4
  var ptr = module._malloc(array.length * nByte)
  module.HEAPF32.set(array, ptr / nByte)
  return ptr
}


const HomePage = () => {
	const [ adderModule, setAdderModule] = useState()

    // Load and instantiate the WebAssembly
	AdderPromise.then ( mod => {
		setAdderModule(mod)
		console.log(mod._adder(1,2))
    console.log(mod)

    // Try the sum of an arry
    var arrayJS = new Int32Array(5);
    for (let i = 0; i < 5; i++) {
      arrayJS[i] = i
    }
    let arrayC = arrayInt32ToPtr(mod, arrayJS);
    console.log(mod._sumArray(arrayC, arrayJS.length));

	})

    return (
      <div>
        <h1>Hello 1+2= {adderModule && adderModule._adder(1,2)}</h1>
        <h2>Page under construction --- our ingeneous engineers are working on it</h2>
        <img  title="Our oompa loompa is processing. Please wait." src={process.env.PUBLIC_URL + './processing.gif'} alt="loading..."  align="middle" />
        </div>
    )
  }
  
  export default HomePage;