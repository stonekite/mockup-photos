import habitat from "preact-habitat";
import Widget from "./Widget";
import css from "./style.css";

const stylesheet = document.createElement("style");
stylesheet.innerHTML = css;
document.head.appendChild(stylesheet);

const _habitat = habitat(Widget);

_habitat.render({
  selector: '[data-widget-host="habitat"]',
  clean: true
});
