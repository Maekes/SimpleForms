export const Vorname = {
    name: 'Vorname',
    title: 'Vorname',
    type: 'text',
    position: 'left',
};
export const Nachname = {
    name: 'Nachname',
    title: 'Nachname',
    type: 'text',
    position: 'right',
};
export const Straße = {
    name: 'Straße',
    title: 'Straße',
    type: 'text',
};
export const Postleitzahl = {
    name: 'PLZ',
    title: 'Postleitzahl',
    type: 'text',
    pattern: '[0-9]{5}',
    maxlength: 5,
    position: 'left',
};
export const Stadt = {
    name: 'Stadt',
    title: 'Stadt',
    type: 'text',
    position: 'right',
};
export const EMail = {
    name: 'EMail',
    title: 'E-Mail',
    type: 'email',
};
export const Telefonnummer = {
    name: 'Telefon',
    title: 'Telefonnummer',
    type: 'tel',
};
export const Handynummer = {
    name: 'Handynummer',
    title: 'Handynummer',
    type: 'tel',
};
export const Geburtstag = {
    name: 'Geburtstag',
    title: 'Geburtstag',
    type: 'date',
};

export const Anmerkungen = {
    name: 'Anmerkungen',
    title: 'Anmerkungen/Hinweise',
    type: 'textarea',
};

export const NAME = [Vorname, Nachname];
export const ADRESSE = [Straße, Postleitzahl, Stadt];
