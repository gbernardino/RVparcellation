import React from "react";
import { slide as Menu } from "react-burger-menu";

export default props => {
  return (
    // Pass on our props
    <Menu {...props}>
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
    </Menu>
  );
};
