// Imports
import colorLuminance from './colorLuminance'
import styles from './../styles/main.css'
import widgetHTML from './../assets/index.html'

function makeForm(options) {
    let formFields = '';
    options?.form?.name === true ? formFields += '<input type="text" name="name" placeholder="Nome (opcional)" />' : '';
    options?.form?.message === true ? formFields += '<input type="text" name="message" placeholder="Mensagem (opcional)" />' : '';
    options?.form?.email === true ? formFields += '<input type="email" name="email" placeholder="E-mail (opcional)" />' : '';
    options?.form?.phone === true ? formFields += '<input type="phone" name="phone" placeholder="Telefone" required/>' : '';
    return formFields
};

function makeIcon(options) {
    let setIcon = 'class="button ';
    options?.theme?.icon ? setIcon += options?.theme?.icon : setIcon += 'whatsapp';
    return setIcon
}

function createTemplate(options) {
    const template = document.createElement('template');
    template.innerHTML = `
        <style>
            ${styles.toString().replaceAll('0d122e', options?.theme ? options?.theme?.color : '0d122e')
            .replaceAll('1a266c', options?.theme ? colorLuminance(options?.theme?.color, 0.05) : '1a266c')
            .replaceAll('44ca6c', options?.theme ? options?.theme?.button : '44ca6c')
            .replaceAll('58d07c', options?.theme ? colorLuminance(options?.theme?.button, 0.05) : '58d07c')
            .replaceAll('ed0000', options?.theme ? options?.theme?.notification : 'ed0000')
        }
        </style>
        ${widgetHTML.toString().replaceAll('<span class="substitute"></span>', makeForm(options))
            .replaceAll('class="button whatsapp', makeIcon(options))
        }
    `
    return template
}

export default createTemplate
