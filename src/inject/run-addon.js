import Localization from "./l10n.js";

// Make sure SA lower than v1.9.0 doesn't run editor-devtools
window.initGUI = true;

const MAIN_JS = "userscript.js";

const path = document.querySelector("script[id='devtools-extension-module']").getAttribute("data-path");
const getURL = (x) => `${path}${x}`;
const scriptUrl = getURL(`addon/${MAIN_JS}`);

const addon = {
  self: {
    _isDevtoolsExtension: true,
  },
  tab: {
    traps: {
      get vm() {
        return Object.values(document.querySelector('div[class^="stage-wrapper_stage-wrapper_"]')).find((x) => x.child)
          .child.child.child.stateNode.props.vm;
      },
    },
    scratchClass(...args) {
      const classNamesArr = [
        ...new Set(
          [...document.styleSheets]
            .filter(
              (styleSheet) =>
                !(
                  styleSheet.ownerNode.textContent.startsWith(
                    "/* DO NOT EDIT\n@todo This file is copied from GUI and should be pulled out into a shared library."
                  ) &&
                  (styleSheet.ownerNode.textContent.includes("input_input-form") ||
                    styleSheet.ownerNode.textContent.includes("label_input-group_"))
                )
            )
            .map((e) => {
              try {
                return [...e.cssRules];
              } catch (e) {
                return [];
              }
            })
            .flat()
            .map((e) => e.selectorText)
            .filter((e) => e)
            .map((e) => e.match(/(([\w-]+?)_([\w-]+)_([\w\d-]+))/g))
            .filter((e) => e)
            .flat()
        ),
      ];
      let res = "";
      args
        .filter((arg) => typeof arg === "string")
        .forEach((classNameToFind) => {
          res +=
            classNamesArr.find(
              (className) =>
                className.startsWith(classNameToFind + "_") && className.length === classNameToFind.length + 6
            ) || "";
          res += " ";
        });
      if (typeof args[args.length - 1] === "object") {
        const options = args[args.length - 1];
        const classNames = Array.isArray(options.others) ? options.others : [options.others];
        classNames.forEach((string) => (res += string + " "));
      }
      res = res.slice(0, -1);
      // Sanitize just in case
      res = res.replace(/"/g, "");
      return res;
    },
  },
};

const langCode = `; ${document.cookie}`.split("; scratchlanguage=").pop().split(";").shift() || navigator.language;
function getL10NURLs() {
  // Note: not identical to Scratch Addons function
  const urls = [getURL(`l10n/${langCode}`)];
  if (langCode.includes("-")) {
    urls.push(getURL(`l10n/${langCode.split("-")[0]}`));
  }
  const enJSON = getURL("l10n/en");
  if (!urls.includes(enJSON)) urls.push(enJSON);
  return urls;
}
const l10nObject = new Localization(getL10NURLs());

const msg = (key, placeholders) => l10nObject.get(`editor-devtools/${key}`, placeholders);
msg.locale = langCode;

l10nObject.loadByAddonId("editor-devtools").then(() =>
  import(scriptUrl).then((module) => {
    const loaded = () => {
      // Remove SA CSS that might affect ours if versions don't match
      const styles = document.querySelector("link[rel=stylesheet][href$='addons/editor-devtools/userscript.css']");
      if (styles) styles.remove();

      // Run
      module.default({
        addon,
        global: {},
        console,
        msg,
        safeMsg: (key, placeholders) => l10nObject.escaped(`editor-devtools/${key}`, placeholders),
      });
    };
    if (document.readyState === "complete") loaded();
    else window.addEventListener("load", () => loaded(), { once: true });
  })
);
