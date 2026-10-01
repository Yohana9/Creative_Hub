/* Contact form: validates, posts to the API, falls back to an email draft when no server is configured. */
(function () {
  "use strict";
  var YR = window.YR || {};
  var form = document.getElementById("contactForm");
  if (!form) return;

  var COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (DRC)","Congo (Republic)","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Somalia","Somaliland","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe","Other"];

  var sel = form.elements.country;
  COUNTRIES.forEach(function (c) { var o = document.createElement("option"); o.value = c; o.textContent = c; if (c === "Ethiopia") o.selected = true; sel.appendChild(o); });

  var opened = Date.now();
  var status = document.getElementById("formStatus"), btn = form.querySelector("button[type=submit]");

  function fieldOf(name) { return form.elements[name] && form.elements[name].closest(".fld"); }
  function setErr(name, msg) {
    var f = fieldOf(name); if (!f) return;
    f.classList.toggle("bad", !!msg);
    var e = f.querySelector(".err"); if (e) e.textContent = msg || "";
  }
  function val(n) { return (form.elements[n].value || "").trim(); }

  function validate() {
    var ok = true;
    var rules = {
      full_name: function (v) { return v.length >= 2 ? "" : "Please enter your full name."; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter a valid email address."; },
      phone: function (v) { return /^[0-9+()\-.\s]{6,40}$/.test(v) ? "" : "Enter a phone number with country code."; },
      country: function (v) { return v ? "" : "Select your country."; },
      city: function (v) { return v.length >= 2 ? "" : "Enter your city."; },
      address: function (v) { return v.length >= 5 ? "" : "Enter your address or area."; },
      subject: function (v) { return v ? "" : "Choose a subject."; },
      message: function (v) { return v.length >= 10 ? "" : "Please write at least 10 characters."; }
    };
    Object.keys(rules).forEach(function (k) { var m = rules[k](val(k)); setErr(k, m); if (m) ok = false; });
    var c = form.elements.consent;
    var cf = c.closest(".check"); var ce = document.getElementById("consentErr");
    if (!c.checked) { ok = false; ce.textContent = "Please agree so I can contact you back."; } else { ce.textContent = ""; }
    return ok;
  }

  function say(msg, cls) { status.textContent = msg; status.className = "form-status " + (cls || ""); }

  function data() {
    var d = {}; ["full_name","email","phone","country","city","address","organization","subject","message"].forEach(function (k) { d[k] = val(k); });
    d.consent = true; d.website = form.elements.hp_site.value; d.t = opened;
    return d;
  }

  function mailtoFallback(d) {
    var to = (YR.cfg && YR.cfg.OWNER_EMAIL) || "yohanreta9@gmail.com";
    var lines = ["Name: " + d.full_name, "Email: " + d.email, "Phone: " + d.phone, "Country: " + d.country, "City: " + d.city,
      "Address: " + d.address, d.organization ? "Organization: " + d.organization : "", "", d.message].filter(function (x, i) { return x !== "" || i === 7; });
    location.href = "mailto:" + to + "?subject=" + encodeURIComponent("[Yohan Records] " + d.subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    say("");
    if (!validate()) { say("Please fix the highlighted fields.", "bad"); var first = form.querySelector(".fld.bad input, .fld.bad select, .fld.bad textarea"); if (first) first.focus(); return; }
    var d = data();
    if (!YR.configured) { say("Opening your email app with the message ready to send.", "ok"); mailtoFallback(d); return; }
    btn.disabled = true; say("Sending");
    YR.api("contact", { method: "POST", body: d }).then(function (r) {
      btn.disabled = false;
      if (!r) {
        // Server configured but unreachable right now (e.g. hosting temporarily down) —
        // don't lose the message, hand it to the visitor's email app instead.
        say("Could not reach the server, so I've opened your email app with the message ready to send instead.", "bad");
        mailtoFallback(d);
        return;
      }
      if (r.error) { say(r.error, "bad"); return; } // server reachable, request rejected (e.g. bad input) — let them fix it, don't mailto
      var panel = document.getElementById("contactPanel");
      panel.textContent = "";
      var wrap = document.createElement("div"); wrap.className = "success-panel";
      var i = document.createElement("i"); i.className = "fas fa-circle-check";
      var h = document.createElement("h3"); h.textContent = "Message sent";
      var p = document.createElement("p"); p.textContent = "Thank you, " + d.full_name.split(" ")[0] + ". Your message has been received (reference #" + r.id + "). I will reply to " + d.email + " as soon as I can.";
      wrap.appendChild(i); wrap.appendChild(h); wrap.appendChild(p); panel.appendChild(wrap);
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  form.addEventListener("input", function (e) { var f = e.target.closest(".fld"); if (f && f.classList.contains("bad")) { f.classList.remove("bad"); var er = f.querySelector(".err"); if (er) er.textContent = ""; } });
})();
