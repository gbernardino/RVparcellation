import React from "react";
import { slide as Menu } from "react-burger-menu";
import {  Link } from "react-router-dom";
export default props => {
  return (
    // Pass on our props
    <Menu {...props}>
        <Link to="/">Home</Link>
        <Link to="/speckletracking2d"> 2D contour  analysis</Link>

        <Link to="/computation">Computation</Link>
        <Link to="/visualisation">Visualisation</Link>
        <Link to="/settings">Settings</Link>
        <Link to="/about">About</Link>


    </Menu>
  );
};
