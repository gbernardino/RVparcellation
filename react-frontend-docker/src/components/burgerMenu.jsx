import React from "react";
import { slide as Menu } from "react-burger-menu";
import { HashRouter, Route, Link } from "react-router-dom";
export default props => {
  return (
    // Pass on our props
    <Menu {...props}>
        <Link to="/">Home</Link>
        <Link to="/computation">computation</Link>
        <Link to="/visualisation">visualisation</Link>
        <Link to="/settings">settings</Link>
        <Link to="/about">about</Link>


    </Menu>
  );
};

/*
      <a className="menu-item" href="/">
        Home
      </a>

      <a className="menu-item" href="/computation">
        Computation
      </a>

      <a className="menu-item" href="/visualisation">
        Visualisation
      </a>

      <a className="menu-item" href="/settings">
        Settings
      </a>

      <a className="menu-item" href="/about">
        About
      </a>
      */