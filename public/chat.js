(() => {
  const script =
    document.currentScript ||
    (() => {
      const scripts = document.getElementsByTagName("script");
      return scripts.at(-1);
    })();

  const token = script.getAttribute("data-token");
  const origin = script.src
    ? new URL(script.src).origin
    : window.location.origin;

  const iframe = document.createElement("iframe");
  iframe.src = origin;
  iframe.style.cssText = [
    "position:fixed",
    "bottom:24px",
    "right:24px",
    "width:400px",
    "height:600px",
    "border:none",
    "border-radius:12px",
    "box-shadow:0 4px 24px rgba(0,0,0,0.2)",
    "z-index:2147483647",
  ].join(";");
  iframe.setAttribute("allow", "microphone");

  iframe.addEventListener("load", () => {
    iframe.contentWindow.postMessage({ type: "auth-token", token }, origin);
  });

  document.body.appendChild(iframe);
})();
