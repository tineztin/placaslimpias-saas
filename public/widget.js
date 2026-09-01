/*!
 * Calculadora Solar — widget.js
 * Uso en la web del cliente:
 *   <div id="solar-calc" data-api-key="SK_LIVE_XXX"></div>
 *   <script src="https://calculadorasolar.top/widget.js" async></script>
 *
 * No valida el dominio del lado del cliente: eso sería falsificable
 * (cualquiera puede leer/copiar este script). El control real de qué
 * dominios pueden mostrar la calculadora lo hace el servidor, vía la
 * cabecera Content-Security-Policy: frame-ancestors que pone /embed en
 * función de los dominios autorizados del suscriptor. Si la api_key no es
 * válida o la suscripción no está activa, /embed ya devuelve su propia
 * página de aviso — este script no necesita saberlo.
 */
(function () {
  "use strict";

  // Origen de este mismo script (nunca hardcodeado): así funciona igual
  // en cualquier entorno (producción, preview de Vercel, local).
  var CURRENT_SCRIPT = document.currentScript;
  var EMBED_ORIGIN = (function () {
    try {
      return new URL(CURRENT_SCRIPT.src).origin;
    } catch (e) {
      return "https://calculadorasolar.top";
    }
  })();

  var DEFAULT_HEIGHT = 560;
  var MIN_HEIGHT = 400;
  var MAX_HEIGHT = 4000;

  function safeApiKey(v) {
    return v && /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null;
  }

  function mount(el) {
    if (el.dataset.solarcalcMounted === "1") return; // evita doble init
    el.dataset.solarcalcMounted = "1";

    var apiKey = safeApiKey(el.getAttribute("data-api-key"));
    if (!apiKey) {
      console.error(
        "[Calculadora Solar] falta o no es válido el atributo data-api-key en",
        el,
      );
      return;
    }

    var iframe = document.createElement("iframe");
    iframe.src = EMBED_ORIGIN + "/embed?key=" + encodeURIComponent(apiKey);
    iframe.title = "Calculadora Solar";
    iframe.loading = "lazy";
    iframe.style.cssText =
      "width:100%;display:block;border:0;height:" + DEFAULT_HEIGHT + "px;";
    el.appendChild(iframe);

    // Guardamos la ventana del iframe para poder distinguirlo de otros
    // widgets si la página incrusta más de uno.
    el._solarcalcWindow = iframe.contentWindow;
    WIDGETS.push({ el: el, iframe: iframe });
  }

  var WIDGETS = [];

  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.source !== "solarcalc" || d.type !== "height") return;

    for (var i = 0; i < WIDGETS.length; i++) {
      // El iframe puede recrear su contentWindow tras una navegación;
      // comparar contra iframe.contentWindow en el momento del mensaje,
      // no contra la referencia guardada al montar.
      if (ev.source === WIDGETS[i].iframe.contentWindow) {
        var h = Number(d.height);
        if (isFinite(h)) {
          WIDGETS[i].iframe.style.height =
            Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(h))) + "px";
        }
        return;
      }
    }
  });

  function init() {
    var targets = document.querySelectorAll("[data-api-key]");
    for (var i = 0; i < targets.length; i++) mount(targets[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
