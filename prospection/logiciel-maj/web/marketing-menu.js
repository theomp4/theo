// Ajoute l'entrée « Marketing · Planning » dans le menu du logiciel, juste avant « Réglages ».
// Chargé par le serveur à la fin de index.html ; ne modifie rien d'autre dans l'interface.
(() => {
  const LIBELLE = "Marketing · Planning";
  const MARQUE = "data-rm-marketing";

  const ouvrir = (e) => {
    e.preventDefault();
    e.stopPropagation();
    location.href = "/marketing";
  };

  // Trouve l'élément cliquable du menu dont le texte est « Réglages » (avec ou sans numéro devant).
  function entreeReglages() {
    const candidats = document.querySelectorAll("nav a, nav button, aside a, aside button, a, button, [role='button'], [role='tab'], li");
    for (const el of candidats) {
      const texte = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (texte.length <= 30 && /R[ée]glages$/i.test(texte)) return el;
    }
    return null;
  }

  function remplacerTexte(noeud) {
    const marcheur = document.createTreeWalker(noeud, NodeFilter.SHOW_TEXT);
    let fait = false;
    while (marcheur.nextNode()) {
      const t = marcheur.currentNode;
      if (!fait && /R[ée]glages/i.test(t.nodeValue)) {
        t.nodeValue = t.nodeValue.replace(/(\d+\.\s*)?R[ée]glages/i, LIBELLE);
        fait = true;
      }
    }
    if (!fait) noeud.textContent = LIBELLE;
  }

  function ajouter() {
    if (document.querySelector(`[${MARQUE}]`)) return true;
    const ref = entreeReglages();
    if (!ref) return false;
    const copie = ref.cloneNode(true);
    copie.setAttribute(MARQUE, "");
    copie.removeAttribute("id");
    copie.removeAttribute("onclick");
    copie.removeAttribute("aria-current");
    copie.removeAttribute("aria-selected");
    copie.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    copie.classList.remove("active", "actif", "selected", "on", "courant");
    if (copie.tagName === "A") copie.setAttribute("href", "/marketing");
    // l'icône de Réglages devient un calendrier
    copie.querySelectorAll("svg").forEach((svg) => {
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.innerHTML = '<rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    });
    copie.querySelectorAll("span, i").forEach((n) => {
      const t = (n.textContent || "").trim();
      if (t && !/[A-Za-zÀ-ÿ0-9]/.test(t) && !n.children.length) n.textContent = "▦";
    });
    remplacerTexte(copie);
    copie.addEventListener("click", ouvrir, true);
    ref.parentNode.insertBefore(copie, ref);
    return true;
  }

  // Bouton flottant si le menu n'a pas été trouvé (interface différente de celle prévue).
  function boutonFlottant() {
    if (document.querySelector(`[${MARQUE}]`)) return;
    const b = document.createElement("a");
    b.href = "/marketing";
    b.setAttribute(MARQUE, "");
    b.textContent = LIBELLE;
    b.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:9999;padding:12px 18px;border-radius:999px;" +
      "background:#4166B0;color:#fff;font:600 14px system-ui,sans-serif;text-decoration:none;" +
      "box-shadow:0 10px 30px rgba(0,0,0,.35)";
    document.body.appendChild(b);
  }

  const debut = Date.now();
  const essayer = () => {
    if (ajouter()) return;
    if (Date.now() - debut > 4000) boutonFlottant();
  };
  essayer();
  // l'interface peut redessiner son menu : on remet l'entrée si elle disparaît
  new MutationObserver(() => { if (!document.querySelector(`[${MARQUE}]`)) essayer(); })
    .observe(document.body, { childList: true, subtree: true });
  setTimeout(essayer, 500);
  setTimeout(essayer, 4100);
})();
