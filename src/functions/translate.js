// Imports
import languages from '../languages/languages'

// Languages
let lang = navigator.language.slice(0, 2) || navigator?.userLanguage.slice(0, 2);

function filterByLang(obj) {
    return obj.lang === lang ? true : false
}
export let userLang = languages.filter(filterByLang)[0].texts;

// Translate function
function translate(place, attr, translation) {
    attr === "innerHTML"
        ? place.innerHTML = translation
        : attr === "placeholder"
            ? place.placeholder = translation
            : attr === "href"
                ? place.href = translation
                : place.innerText = translation;
}

export default translate