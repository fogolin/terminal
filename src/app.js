// Imports
import template from './functions/template';
import toggle from './functions/toggle';
import translate, { userLang } from './functions/translate';
import updateTitle from './functions/updateTitle';

// Widget tag name
const WIDGET_TAG = 'firelin-terminal';

// Configures and defines the web component
export default function createWidget(options) {
    class FirelinTerminalElement extends HTMLElement {
        constructor() {
            super();
            const shadowDOM = this.attachShadow({ mode: 'open' });
            // Render the template in the shadow dom
            shadowDOM.appendChild(template(options).content.cloneNode(true));
        }

        connectedCallback() {
            this.handleForm();
            this.translator();
            this.title();
            this.toggleState();
            this.formSubmit();
        }

        // Translation logic
        translator() {
            // Query selector for Shadow Root
            function qs(selector) {
                return document.querySelector(WIDGET_TAG).shadowRoot.querySelector(selector)
            };

            // Translate default pieces
            translate(qs('.bitsPopup .agentName'), "innerHTML", userLang.title);
            translate(qs('.bitsPopup .textLine'), "innerHTML", userLang.description);
            translate(qs('.bitsPopup .form .ctaButton .button-label'), "innerText", userLang.form.cta);
            translate(qs('.bitsPopup .divider .ctaButton .button-label'), "innerText", userLang.form.call);

            // Translate especific pieces if exist
            function translateSpecific(options) {
                options?.form?.name ? translate(qs('.bitsPopup input[name="name"]'), "placeholder", userLang.form.name) : '';
                options?.form?.email ? translate(qs('.bitsPopup input[name="email"]'), "placeholder", userLang.form.email) : '';
                options?.form?.phone ? translate(qs('.bitsPopup input[name="phone"]'), "placeholder", userLang.form.phone) : '';
                options?.form?.message ? translate(qs('.bitsPopup input[name="message"]'), "placeholder", userLang.form.msg) : '';

                options?.client?.title ? translate(qs('.bitsPopup .agentName'), "innerHTML", options?.client?.title) : '';
                options?.client?.message ? translate(qs('.bitsPopup .textLine'), "innerHTML", options?.client?.message) : '';
                options?.client?.ctaLink ? translate(qs('.bitsPopup .divider a'), "href", options?.client?.ctaLink) : '';
                options?.client?.ctaDisplay ? translate(qs('.bitsPopup .divider .ctaButton .button-label'), "innerText", options?.client?.ctaDisplay) : '';
            }
            translateSpecific(options);
        }

        // Title logic
        title() {
            options?.title ? updateTitle(userLang.pageTitle) : '';
        }

        // Toggle function
        toggleState() {
            // Query selector for Shadow Root
            function qs(selector) {
                return document.querySelector(WIDGET_TAG).shadowRoot.querySelector(selector)
            };

            toggle(qs('.chatWindow'),
                qs('.bitsPopup'),
                qs('.bitsPopup .toggleForm'),
                qs('.bitsPopup .buttonMinimize'),
                options)
        }

        // Handle form basic functions
        handleForm() {
            // Query selector for Shadow Root
            function qs(selector) {
                return document.querySelector(WIDGET_TAG).shadowRoot.querySelector(selector)
            };

            // Handle default state of the CTA button
            function addChanges() {
                let link = 'https://wa.me/' + options?.client?.whatsappNumber + '?text="' + options?.client?.whatsappMessage + '"';
                qs('.bitsPopup .form .ctaButton').setAttribute("onClick", "window.open('" + link + "','_blank')");
                qs('.bitsPopup form').setAttribute("onsubmit", "return false");
            };

            function removeChanges() {
                qs('.bitsPopup .form .ctaButton').removeAttribute("onClick");
                qs('.bitsPopup form').removeAttribute("onsubmit");
            };

            function doChanges() {
                // Checks if phone is inserted
                options?.form?.phone ?
                    qs('.bitsPopup input[name="phone"]').value.includes(userLang.form.phone) ||
                        qs('.bitsPopup input[name="phone"]').value === '+' ||
                        qs('.bitsPopup input[name="phone"]').value.length < 8 ? addChanges() : removeChanges()
                    : '';
            }
            doChanges();
            options?.form?.phone ?
                qs('.bitsPopup input[name="phone"]').addEventListener("input", function () { doChanges() })
                : '';
        }

        // Handle form submission
        formSubmit() {
            // Query selector for Shadow Root
            function qs(selector) {
                return document.querySelector(WIDGET_TAG).shadowRoot.querySelector(selector)
            };

            // Handle submit
            qs('.bitsPopup .callApi').addEventListener('submit', function (e) {
                let token = options?.auth?.token;
                let endpoint = `https://api-${options?.auth?.endpoint}.bitsti.com.br/api/messages/send`;
                let message = () => {
                    let msg = '';
                    msg += userLang.defaults.userAlternate;
                    if (qs('.bitsPopup input[name="name"]')) {
                        msg += ' ' + qs('.bitsPopup input[name="name"]').value;
                    }
                    if (qs('.bitsPopup input[name="message"]')) {
                        msg += userLang.defaults.messageStart + userLang.defaults.messageHasContentStart + qs('.bitsPopup input[name="message"]').value + userLang.defaults.messageHasContentEnd + userLang.defaults.messageEnd;
                    } else {
                        msg += userLang.defaults.messageStart + userLang.defaults.messageEnd;
                    }
                    msg += userLang.defaults.userUrl + window.location.href + '_';
                    return msg;
                }

                e.preventDefault();
                qs('.bitsPopup form').getAttribute('onsubmit') === 'return false' ? '' :
                    fetch(endpoint, {
                        method: "POST",
                        headers: {
                            "Content-type": "application/json",
                            "Authorization": "Bearer " + token + ""
                        },
                        body: JSON.stringify({
                            number: qs('.bitsPopup input[name="phone"]').value.replace(/\D/g, ""),
                            body: message()
                        })
                    }).then(res => {
                        // console.log("Request complete! response:", res);
                        qs(".bitsPopup .form").innerHTML = "<strong>" + userLang.form.sent + "</strong>";
                    });
            });
        }
    }
    if (!customElements.get(WIDGET_TAG)) {
        customElements.define(WIDGET_TAG, FirelinTerminalElement);
    }

    // Create an instance of the component
    const componentInstance = document.createElement(WIDGET_TAG, {
        is: WIDGET_TAG,
    });

    // Mount the component instance in the body element
    const container = document.body;
    container.appendChild(componentInstance);

    // Returning the instance will be useful later
    return componentInstance;
}