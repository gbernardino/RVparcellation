import React from 'react';


const AboutPage = () => {
    return (
      <div>
        <h2>Page under construction --- our ingeneous engineers are working on it</h2>
        <img  title="Our oompa loompa is processing. Please wait." src={process.env.PUBLIC_URL + './processing.gif'} alt="loading..." class="center"/>
        </div>
    )
  }
  
  export default AboutPage;