import { h } from "preact";
/** @jsx h */
import habitat from "preact-habitat";
import Widget from "./Widget";

let _habitat = habitat(Widget);

_habitat.render({
  selector: '[data-widget-host="habitat"]',
  clean: true
});
