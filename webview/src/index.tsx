import { createRoot } from "react-dom/client";
import Webview from "./Webview";
import { doStuff, Test } from "5board.vsc-common";

function start() {
  const root = createRoot(document.getElementById("root")!);
  root.render(<Webview></Webview>);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}

const t: Test = {};

console.log(doStuff("Hello from Webview!"));