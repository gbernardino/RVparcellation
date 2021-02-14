import React, { useState } from 'react'
// import the Javascript plumbing file


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

    return (
      <div>
        <h2>Page under construction --- our ingeneous engineers are working on it</h2>
        <img  title="Our oompa loompa is processing. Please wait." src={'processing.gif'} alt="loading..."  align="middle" />
        </div>
    )
  }
  
  export default HomePage;